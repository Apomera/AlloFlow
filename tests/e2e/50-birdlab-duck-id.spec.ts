/**
 * Bird Lab — Duck ID: dabbler vs diver as one picture.
 *
 * The view said it in words only: dabblers tip up in the shallows, have their
 * legs near the middle and spring straight up; divers go under, have their
 * legs set far back and run across the water to take off. The picture now
 * shows all three, and these checks measure it: where each bird sits against
 * the surface, where its legs attach along the body, and which way each
 * take-off arrow points.
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

async function mount(page: Page) {
  await page.goto(`${(harness as any).base}/__harness`);
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.birdLab, null, { timeout: 30000 });
  await page.evaluate(() => (window as any).__mount({ birdLab: { view: 'duckId' } }));
  await page.waitForSelector('[data-duckid-figure]');
}

test('the dabbler tips up at the surface; the diver is wholly under water', async ({ page }) => {
  await mount(page);
  const m = await page.evaluate(() => {
    const svg = document.querySelector('[data-duckid-figure]') as SVGSVGElement;
    const surf = Number(svg.querySelector('[data-duck-surface]')!.getAttribute('data-duck-surface'));
    // Tail tip (x 16) and bill tip (x 231) of the duck outline, mapped into the scene.
    const pt = (panel: string, x: number, y: number) => {
      const g = svg.querySelector(`[data-duck-panel="${panel}"] > g`) as SVGGElement;
      const m = (svg.getScreenCTM()!.inverse()).multiply(g.getScreenCTM()!);
      const p = new DOMPoint(x, y).matrixTransform(m);
      return [p.x, p.y];
    };
    const legs = (panel: string) => Number(svg.querySelector(`[data-duck-panel="${panel}"] [data-duck-legs]`)!.getAttribute('data-duck-legs'));
    return { surf, dTail: pt('dabbler', 16, 84), dBill: pt('dabbler', 231, 62), vTail: pt('diver', 16, 84), vBill: pt('diver', 231, 62),
      vTop: pt('diver', 178, 36), dLegs: legs('dabbler'), vLegs: legs('diver') };
  });
  expect(m.dTail[1], 'dabbler tail in the air').toBeLessThan(m.surf - 20);
  expect(m.dBill[1], 'dabbler bill under water').toBeGreaterThan(m.surf + 40);
  for (const [k, p] of Object.entries({ tail: m.vTail, bill: m.vBill, crown: m.vTop })) expect(p[1], `diver ${k} under water`).toBeGreaterThan(m.surf + 20);
  // The diver reaches deeper than the dabbler.
  expect(m.vBill[1]).toBeGreaterThan(m.dBill[1]);
  // Legs: near the middle of the body for a dabbler, near the tail for a diver.
  expect(m.dLegs).toBeGreaterThan(0.35);
  expect(m.dLegs).toBeLessThan(0.65);
  expect(m.vLegs).toBeLessThan(0.25);
});

test('take-off: the dabbler straight up, the diver along the water', async ({ page }) => {
  await mount(page);
  const a = await page.evaluate(() => [...document.querySelectorAll('[data-duck-arrow]')].map((el) => {
    const b = (el as SVGGraphicsElement).getBBox();
    return { who: el.getAttribute('data-duck-arrow'), w: b.width, h: b.height };
  }));
  const dab = a.find((x) => x.who === 'dabbler')!, div = a.find((x) => x.who === 'diver')!;
  expect(dab.h).toBeGreaterThan(20);
  expect(dab.w).toBeLessThan(3);
  expect(div.w).toBeGreaterThan(60);
  expect(div.h).toBeLessThan(3);
  await expect(page.getByText('springs straight up')).toBeVisible();
  await expect(page.getByText('runs across the water')).toBeVisible();
});
