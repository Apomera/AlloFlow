import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const captures = resolve('reports/avian-richness-2026-10-17/final');

const harness = new GlHarness({
  toolId: 'birdLab', toolFile: 'stem_lab/stem_tool_birdlab.js',
  preScripts: ['stem_lab/stem_lab_module.js'],
  extraScripts: ['node_modules/axe-core/axe.min.js'],
  width: 1280, height: 960, appStyles: true, layout: 'document',
});
test.describe.configure({ timeout: 90_000, retries: 0, mode: 'serial' });
test.beforeAll(async () => { mkdirSync(captures, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function mount(page: Page, width: number) {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(String(error)));
  await page.setViewportSize({ width, height: 960 });
  await page.goto(`${(harness as any).base}/__harness`);
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.birdLab);
  await page.evaluate(width => {
    localStorage.clear();
    const wrap = document.querySelector('#wrap') as HTMLElement;
    wrap.style.width = width + 'px';
    wrap.setAttribute('data-stem-tool-shell', 'true');
    (window as any).__mount({ birdLab: { view: 'menu', activeHabitat: 'forest', blSceneMotion: false, blLifeList: {}, blBadges: {}, blXp: 0 } });
  }, width);
  await expect(page.locator('[data-birdlab-atlas]')).toBeVisible();
  return errors;
}

for (const width of [1280, 390]) {
  test(`habitat atlas: preview, keyboard, and chosen destination at ${width}px`, async ({ page }) => {
    const errors = await mount(page, width);
    const atlas = page.locator('[data-birdlab-atlas]');
    await page.screenshot({ path: resolve(captures, `bird-home-${width}.png`) });
    await atlas.screenshot({ path: resolve(captures, `bird-atlas-forest-${width}.png`) });
    const forest = page.locator('[data-birdlab-atlas-tab="forest"]');
    await expect(atlas).toHaveAttribute('data-birdlab-atlas', 'forest');
    await expect(atlas.locator('[data-birdlab-atlas-specimen]')).toHaveAttribute('data-birdlab-atlas-specimen', 'chickadee');
    await forest.focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('[data-birdlab-atlas-tab="marsh"]')).toBeFocused();
    await expect(atlas).toHaveAttribute('data-birdlab-atlas', 'marsh');
    await atlas.locator('[data-birdlab-atlas-pin="kingfisher"]').click();
    await expect(atlas.locator('[data-birdlab-atlas-specimen]')).toHaveAttribute('data-birdlab-atlas-specimen', 'kingfisher');
    await expect(atlas.getByRole('button', { name: 'Belted Kingfisher', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await atlas.getByRole('button', { name: 'Red-winged Blackbird', exact: true }).click();
    await expect(atlas.locator('[data-birdlab-atlas-pin="redwingBlackbird"]')).toHaveAttribute('aria-pressed', 'true');
    await page.locator('[data-birdlab-atlas-tab="coast"]').click();
    await expect(atlas.locator('.birdlab-atlas-map-note')).toContainText('4 species to discover');
    await expect(atlas.locator('[data-birdlab-atlas-specimen]')).toHaveAttribute('data-birdlab-atlas-specimen', 'puffin');
    await atlas.screenshot({ path: resolve(captures, `bird-atlas-coast-${width}.png`) });
    // A specimen preview is not a sighting, an explored module, or earned XP.
    expect(await page.evaluate(() => {
      const state = (window as any).__toolData.birdLab;
      return { lifeList: state.blLifeList, badges: state.blBadges, xp: state.blXp };
    })).toEqual({ lifeList: {}, badges: {}, xp: 0 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    const violations = await page.evaluate(async () => {
      const result = await (window as any).axe.run(document.querySelector('[data-birdlab-menu]'), {
        runOnly: { type: 'rule', values: ['color-contrast', 'button-name', 'aria-valid-attr-value', 'aria-required-children', 'aria-required-parent'] },
      });
      return result.violations.map((item: any) => ({ id: item.id, nodes: item.nodes.map((node: any) => node.target) }));
    });
    expect(violations).toEqual([]);
    await page.locator('[data-birdlab-atlas-enter="coast"]').click();
    await expect(page.locator('[data-birdlab-ispy]')).toBeVisible();
    await expect(page.locator('[data-birdlab-realistic-scene]')).toHaveAttribute('data-birdlab-realistic-scene', 'coast');
    expect(errors).toEqual([]);
  });
}

test('ambient motion can be paused, and reduced motion keeps preview markers still', async ({ page }) => {
  const errors = await mount(page, 1280);
  await page.getByRole('button', { name: 'Pause ambient motion', exact: true }).click();
  await expect(page.locator('[data-birdlab-menu]')).toHaveAttribute('data-birdlab-atmosphere', 'still');
  expect(await page.locator('.birdlab-hero-flyer').first().evaluate(el => getComputedStyle(el).animationPlayState)).toBe('paused');
  await page.getByRole('button', { name: 'Play ambient motion', exact: true }).click();
  await expect(page.locator('[data-birdlab-menu]')).toHaveAttribute('data-birdlab-atmosphere', 'moving');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await page.locator('.birdlab-atlas-pin[aria-pressed="true"]').evaluate(el => getComputedStyle(el, '::after').animationName)).toBe('none');
  expect(await page.locator('.birdlab-hero-flyer').first().evaluate(el => getComputedStyle(el).animationName)).toBe('none');
  await page.getByRole('button', { name: /COLLECT YOUR DISCOVERIES Your life list/i }).click();
  await expect(page.locator('[data-birdlab-menu]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Back to BirdLab menu' })).toBeVisible();
  expect(errors).toEqual([]);
});
