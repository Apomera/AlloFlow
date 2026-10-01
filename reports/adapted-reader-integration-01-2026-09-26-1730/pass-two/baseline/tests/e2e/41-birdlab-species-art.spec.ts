/**
 * Bird Lab — species drawings are framed, not cropped.
 *
 * The BIRDS art is drawn in a nominal 30-unit box, but many birds overhang it:
 * the eagle's and puffin's bills, the gull, the heron's neck (to y 52). Six
 * views drew it in a fixed 0 0 30 30 viewBox and cut those parts off. Each
 * drawing is now framed on its own measured extent, on every render (the same
 * <svg> switches species in Habitat Match and the species pickers).
 *
 * Checked by geometry: the drawing's on-screen box must sit inside its svg's.
 */
import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolId: 'birdLab',
  toolFile: 'stem_lab/stem_tool_birdlab.js',
  preScripts: ['stem_lab/stem_lab_module.js'],
  width: 1100,
  height: 900,
  appStyles: true,
  layout: 'document',
});

test.describe.configure({ timeout: 300_000 });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function mount(page: Page, view: string, wait: string) {
  await page.goto(`${(harness as any).base}/__harness`);
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.birdLab, null, { timeout: 30000 });
  await page.evaluate((v) => (window as any).__mount({ birdLab: { view: v } }), view);
  await page.waitForSelector(wait, { timeout: 30000 });
}

// Every fitted drawing, and how far it spills out of its frame (px).
const spills = (page: Page, scope = 'body') => page.evaluate((sel) => [...document.querySelectorAll(`${sel} svg[data-bird-art-fit]`)].map((svg) => {
  const box = svg.getBoundingClientRect(), art = (svg.firstElementChild as SVGGraphicsElement).getBoundingClientRect();
  const spill = Math.max(box.left - art.left, art.right - box.right, box.top - art.top, art.bottom - box.bottom, 0);
  return { name: svg.getAttribute('data-bird-art') || svg.getAttribute('aria-label') || svg.closest('li')?.querySelector('h3')?.textContent || '?', spill,
    fill: Math.max(art.width / box.width, art.height / box.height) };
}), scope);

test('life list: no species drawing is cropped', async ({ page }) => {
  await mount(page, 'lifeList', 'li svg[data-bird-art-fit]');
  const rows = await spills(page);
  expect(rows.length, 'drawings on the life list').toBeGreaterThanOrEqual(20);
  for (const r of rows) {
    expect(r.spill, `${r.name} is cropped by ${r.spill.toFixed(1)}px`).toBeLessThan(1);
    // Framed, not shrunk to a speck: the drawing fills most of its frame.
    expect(r.fill, `${r.name} fills ${(r.fill * 100).toFixed(0)}% of its frame`).toBeGreaterThan(0.8);
  }
});

test('habitat match: each question shows the bird, re-framed when it changes', async ({ page }) => {
  await mount(page, 'habitatMatch', '[data-habitat-portrait] svg[data-bird-art]');
  await expect(page.locator('[data-habitat-portrait] svg')).toHaveAttribute('data-bird-art', 'puffin');
  expect((await spills(page, '[data-habitat-portrait]'))[0].spill).toBeLessThan(1);
  await page.getByRole('button', { name: 'Next →' }).click();
  // Question 2 is the Great Blue Heron: the tallest drawing, 47 units high.
  await expect(page.locator('[data-habitat-portrait] svg')).toHaveAttribute('data-bird-art', 'greatBlueHeron');
  const heron = (await spills(page, '[data-habitat-portrait]'))[0];
  expect(heron.spill, 'heron cropped after switching species').toBeLessThan(1);
});

test('habitat to birds: species chips carry their drawings', async ({ page }) => {
  await mount(page, 'habitatMatch', '[data-habitat-portrait]');
  await page.getByRole('tab', { name: /Habitat to Birds/ }).click();
  const chip = page.getByRole('button', { name: /Black-capped Chickadee/ });
  await expect(chip.locator('svg[data-bird-art="chickadee"]')).toHaveCount(1);
  for (const r of await spills(page)) expect(r.spill, `${r.name} cropped`).toBeLessThan(1);
});
