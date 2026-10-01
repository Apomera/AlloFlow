/**
 * Bird Lab — Maine Habitats Deep: a walk from the open ocean to a mountaintop.
 *
 * Twelve habitats were twelve text buttons. They now sit in one landscape,
 * each numbered like its button. These checks tie every numbered zone to the
 * button with the same number, make a zone click and a button click select
 * the same habitat, and keep the walk in order: the sea at the left edge,
 * spruce-fir on the highest ground at the right.
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

// 600 s: under heavy machine load one zone click has taken 3.6 min.
test.describe.configure({ timeout: 600_000 });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function mount(page: Page, width = 1100) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(`${(harness as any).base}/__harness`);
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.birdLab, null, { timeout: 30000 });
  await page.evaluate((w) => {
    (document.querySelector('#wrap') as HTMLElement).style.width = w + 'px';
    (window as any).__mount({ birdLab: { view: 'habitatsDeep' } });
  }, width);
  await page.waitForSelector('[data-habitat-walk]');
}

const heading = (page: Page) => page.locator('h2').filter({ hasText: '🌲' }).first().textContent();

test('every numbered zone is the habitat its button names, in walk order', async ({ page }) => {
  await mount(page);
  const got = await page.evaluate(() => ({
    zones: [...document.querySelectorAll('[data-habitat-zone]')].map((g) => ({ name: g.getAttribute('data-habitat-zone')!, n: Number(g.getAttribute('data-n')),
      x0: Number(g.getAttribute('data-x0')), x1: Number(g.getAttribute('data-x1')), badge: g.querySelector('text')!.textContent })),
    buttons: [...document.querySelectorAll('[data-habitat-button]')].map((b) => ({ n: Number(b.getAttribute('data-habitat-button')), text: b.textContent!.trim() })),
    ground: [...document.querySelectorAll('[data-habitat-walk] path')].length,
  }));
  expect(got.buttons.length).toBe(12);
  expect(got.zones.length).toBe(12);
  for (const z of got.zones) {
    expect(z.badge, z.name).toBe(String(z.n));
    // The button with that number names the same habitat.
    expect(got.buttons[z.n - 1].text, z.name).toBe(`${z.n}${z.name}`);
  }
  // Zones tile the walk left to right with no gaps or overlaps.
  const byX = [...got.zones].sort((a, b) => a.x0 - b.x0);
  expect(byX[0].x0).toBe(0);
  for (let i = 1; i < byX.length; i++) expect(byX[i].x0, byX[i].name).toBe(byX[i - 1].x1);
  const order = byX.map((z) => z.name);
  expect(order[0]).toBe('Pelagic + Offshore');
  expect(order.indexOf('Beach + Dune')).toBeLessThan(order.indexOf('Salt Marsh'));
  expect(order.indexOf('Salt Marsh')).toBeLessThan(order.indexOf('Northern Hardwood Forest'));
  expect(order[order.length - 1]).toBe('Spruce-Fir (Boreal) Forest');
});

test('spruce-fir holds the highest ground; the sea holds the lowest', async ({ page }) => {
  await mount(page);
  const tops = await page.evaluate(() => {
    const svg = document.querySelector('[data-habitat-walk]') as SVGSVGElement;
    return Object.fromEntries([...svg.querySelectorAll('[data-ground]')].map((p) => [p.getAttribute('data-ground'), (p as SVGGraphicsElement).getBBox().y]));
  });
  expect(Object.keys(tops).length).toBe(12);
  // Clearly above every other zone, not a tie at the shared edge with the bog.
  const peak = tops['Spruce-Fir (Boreal) Forest'];
  for (const [k, v] of Object.entries(tops)) if (k !== 'Spruce-Fir (Boreal) Forest') expect(peak + 20, k).toBeLessThan(v);
  const lowest = Object.entries(tops).sort((a, b) => b[1] - a[1])[0][0];
  expect(lowest).toBe('Pelagic + Offshore');
});

test('a zone click and a button click select the same habitat', async ({ page }) => {
  await mount(page);
  expect(await heading(page)).toContain('Northern Hardwood Forest');
  await expect(page.locator('[data-habitat-zone="Northern Hardwood Forest"]')).toHaveAttribute('data-selected', 'true');
  // Click the salt marsh in the picture (the middle of its zone, not the badge).
  await page.locator('[data-habitat-zone="Salt Marsh"]').click();
  expect(await heading(page)).toContain('Salt Marsh');
  await expect(page.locator('[data-habitat-zone="Salt Marsh"]')).toHaveAttribute('data-selected', 'true');
  await expect(page.locator('[data-habitat-zone="Northern Hardwood Forest"]')).toHaveAttribute('data-selected', 'false');
  const n = await page.locator('[data-habitat-zone="Salt Marsh"]').getAttribute('data-n');
  await expect(page.locator(`[data-habitat-button="${n}"]`)).toHaveAttribute('aria-pressed', 'true');
  // And the other way round.
  await page.locator('[data-habitat-button]').filter({ hasText: 'Beach + Dune' }).click();
  expect(await heading(page)).toContain('Beach + Dune');
  await expect(page.locator('[data-habitat-zone="Beach + Dune"]')).toHaveAttribute('data-selected', 'true');
  await expect(page.locator('[data-habitat-zone="Salt Marsh"]')).toHaveAttribute('data-selected', 'false');
});

test('no sideways scroll on a 390px phone', async ({ page }) => {
  await mount(page, 390);
  const over = await page.evaluate(() => {
    const wrap = document.querySelector('#wrap') as HTMLElement;
    return wrap.scrollWidth - wrap.clientWidth;
  });
  expect(over, 'horizontal overflow in px').toBeLessThanOrEqual(1);
});
