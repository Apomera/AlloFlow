/**
 * Bird Lab — illustrated and animated reference views.
 *
 * Behaviors, Iconic Maine Birds, Physiology, Feeders, Bird Art and the
 * habitat pickers were text cards or emoji tiles. Each now carries a drawing.
 * jsdom can say the <svg> exists; only a browser can say it has size, sits
 * inside its card, and swaps when the learner picks another topic. These
 * checks click through every topic and measure the drawing each time.
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

async function mount(page: Page, view: string, wait: string, width = 1100) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.setViewportSize({ width, height: 900 });
  await page.goto(`${(harness as any).base}/__harness`);
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.birdLab, null, { timeout: 30000 });
  await page.evaluate((w) => { (document.querySelector('#wrap') as HTMLElement).style.width = w + 'px'; }, width);
  await page.evaluate((v) => (window as any).__mount({ birdLab: { view: v } }), view);
  await page.waitForSelector(wait, { timeout: 30000 });
  return errors;
}

// The drawing has painted content and does not spill out of its card.
async function drawn(page: Page, selector: string) {
  return page.evaluate((sel) => [...document.querySelectorAll(sel)].map((svg) => {
    const box = svg.getBoundingClientRect();
    const art = (svg as SVGSVGElement).getBBox();
    let card = svg.parentElement as HTMLElement;
    while (card && !/rounded-xl/.test(card.className)) card = card.parentElement as HTMLElement;
    const c = (card || document.body).getBoundingClientRect();
    return { w: box.width, h: box.height, artW: art.width, artH: art.height,
      inside: box.left >= c.left - 1 && box.right <= c.right + 1 };
  }), selector);
}

test('behaviors: every topic swaps in its own vignette', async ({ page }) => {
  const errors = await mount(page, 'behaviors', '[data-birdlab-behavior-vignette]');
  const topics = await page.locator('.flex.gap-2.flex-wrap.mb-3 button').allTextContents();
  expect(topics.length).toBe(8);
  const seen = new Set<string>();
  for (const topic of topics) {
    await page.getByRole('button', { name: topic, exact: true }).click();
    const v = page.locator('[data-birdlab-behavior-vignette]');
    await expect(v).toHaveAttribute('data-birdlab-behavior-vignette', topic);
    const [m] = await drawn(page, '[data-birdlab-behavior-vignette]');
    expect(m.w, topic + ' width').toBeGreaterThan(200);
    expect(m.artW * m.artH, topic + ' painted area').toBeGreaterThan(8000);
    expect(m.inside, topic + ' inside its card').toBe(true);
    seen.add(await v.innerHTML());
  }
  expect(seen.size, 'each topic draws something different').toBe(8);
  expect(errors).toEqual([]);
});

test('iconic Maine birds: ten scenes, each with its bird', async ({ page }) => {
  const errors = await mount(page, 'iconic', '[data-birdlab-iconic-scene]');
  const names = await page.locator('.flex.gap-2.flex-wrap.mb-3 button').allTextContents();
  expect(names.length).toBe(10);
  for (const name of names) {
    await page.getByRole('button', { name, exact: true }).click();
    const scene = page.locator('[data-birdlab-iconic-scene]');
    await expect(scene).toHaveAttribute('data-birdlab-iconic-scene', name);
    // The bird group is the one scaled up from a portrait or a silhouette.
    const birdArea = await scene.evaluate((svg) => {
      const bird = svg.querySelector('g[transform^="translate(300"]') as SVGGElement;
      const b = bird.getBBox();
      return b.width * b.height;
    });
    expect(birdArea, name + ' bird drawn').toBeGreaterThan(1500);
  }
  expect(errors).toEqual([]);
});

test('physiology, feeders and art: every card carries a sized drawing', async ({ page }) => {
  for (const [view, sel, count] of [
    ['physiology', '[data-birdlab-physiology-diagram]', 8],
    ['feeder', '[data-birdlab-feeder-art]', 10],
    ['art', '[data-birdlab-art-era]', 6],
  ] as const) {
    const errors = await mount(page, view, sel);
    const rows = await drawn(page, sel);
    expect(rows.length, view).toBe(count);
    for (const r of rows) {
      expect(r.w, view + ' width').toBeGreaterThan(100);
      expect(r.artW * r.artH, view + ' painted').toBeGreaterThan(3000);
      expect(r.inside, view + ' inside card').toBe(true);
    }
    expect(errors, view).toEqual([]);
  }
});

test('phone width: drawings stay inside their cards', async ({ page }) => {
  for (const [view, sel] of [
    ['physiology', '[data-birdlab-physiology-diagram]'],
    ['feeder', '[data-birdlab-feeder-art]'],
    ['art', '[data-birdlab-art-era]'],
    ['behaviors', '[data-birdlab-behavior-vignette]'],
  ] as const) {
    await mount(page, view, sel, 380);
    for (const r of await drawn(page, sel)) expect(r.inside, view + ' at 380px').toBe(true);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, view + ' horizontal scroll').toBeLessThanOrEqual(1);
  }
});

test('habitat pickers show the real habitats', async ({ page }) => {
  await mount(page, 'habitatMatch', '[data-birdlab-habitat-thumb]');
  const thumbs = page.locator('[role="radiogroup"] [data-birdlab-habitat-thumb]');
  await expect(thumbs).toHaveCount(5);
  for (const m of await drawn(page, '[role="radiogroup"] [data-birdlab-habitat-thumb]')) {
    expect(m.w).toBeGreaterThan(80);
    expect(m.artW).toBeGreaterThan(800);
  }
  await page.getByRole('tab', { name: /Habitat to Birds/ }).click();
  await expect(page.locator('[role="radiogroup"] [data-birdlab-habitat-thumb]')).toHaveCount(5);
});
