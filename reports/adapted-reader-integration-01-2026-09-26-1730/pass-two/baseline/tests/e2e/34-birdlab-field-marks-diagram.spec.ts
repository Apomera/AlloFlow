/**
 * Bird Lab — Field Marks Trainer: every hotspot ring sits on the part it names.
 *
 * The three teaching birds used to be the 24-unit icon scaled 13x into a 320x240
 * viewBox. The bird ran off the right and bottom edges (the chickadee showed as
 * a giant cropped head), and the hand-typed ring positions matched neither: the
 * "eye" ring sat in empty space above the cap. On a 390px phone the diagram box
 * also overflowed, because min-height on an aspect-ratio box becomes min-width.
 *
 * Now each field-mark shape carries data-part="<hotspot id>". This spec asks the
 * browser, for every ring, whether its centre is inside the fill of that shape,
 * which is the question a student's eye asks.
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

const SPECIES = [
  { tab: /Chickadee/, rings: 8 },
  { tab: /Yellow-rumped Warbler/, rings: 8 },
  { tab: /White-throated Sparrow/, rings: 8 },
];

async function mount(page: Page, width: number) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(`${(harness as any).base}/__harness`);
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.birdLab, null, { timeout: 30000 });
  await page.evaluate((w) => {
    (window as any).__mount({ birdLab: { view: 'fieldMarks' } });
    (document.querySelector('#wrap') as HTMLElement).style.width = w + 'px';
  }, width);
  await page.waitForSelector('svg[aria-label*="clickable field-mark hotspots"] [data-hotspot]', { timeout: 30000 });
}

// For the main diagram only (the detail card's zoom inset draws the bird again).
const geometry = (page: Page) => page.evaluate(() => {
  const svg = document.querySelector('svg[aria-label*="clickable field-mark hotspots"]') as SVGSVGElement;
  const rings = [...svg.querySelectorAll('[data-hotspot]')] as SVGCircleElement[];
  const bird = svg.querySelector('[data-bird]') as SVGGElement;
  // Measure in the diagram's own (viewBox) coordinates, THROUGH any transform:
  // getBBox() and isPointInFill() work in an element's local space, so a
  // transform on the bird group once moved the whole drawing while both
  // measurements still passed.
  const toScreen = svg.getScreenCTM() as DOMMatrix;
  const fromScreen = toScreen.inverse();
  const scenery = [...svg.querySelectorAll('[data-scenery]')] as SVGGElement[];
  scenery.forEach((s) => { s.style.display = 'none'; });
  const r = bird.getBoundingClientRect();
  scenery.forEach((s) => { s.style.display = ''; });
  const tl = new DOMPoint(r.left, r.top).matrixTransform(fromScreen);
  const br = new DOMPoint(r.right, r.bottom).matrixTransform(fromScreen);
  return {
    bird: bird.getAttribute('data-bird'),
    bbox: [tl.x, tl.y, br.x, br.y],
    rings: rings.map((c) => {
      const id = c.getAttribute('data-hotspot') as string;
      const x = Number(c.getAttribute('cx')); const y = Number(c.getAttribute('cy'));
      const screen = new DOMPoint(x, y).matrixTransform(c.getScreenCTM() as DOMMatrix);
      const shapes = [...svg.querySelectorAll(`[data-part="${id}"]`)] as SVGGeometryElement[];
      const inside = shapes.some((s) => {
        const local = screen.matrixTransform((s.getScreenCTM() as DOMMatrix).inverse());
        const p = svg.createSVGPoint(); p.x = local.x; p.y = local.y;
        return s.isPointInFill(p);
      });
      return { id, x, y, shapes: shapes.length, inside };
    }),
  };
});

test('every ring sits inside the drawn part it names, for all three birds', async ({ page }) => {
  await mount(page, 1100);
  for (const sp of SPECIES) {
    await page.getByRole('tab', { name: sp.tab }).click();
    const g = await geometry(page);
    expect(g.rings, `${g.bird} ring count`).toHaveLength(sp.rings);
    for (const r of g.rings) {
      expect(r.shapes, `${g.bird}.${r.id} has no drawn part`).toBeGreaterThan(0);
      expect(r.inside, `${g.bird}.${r.id} ring centre (${r.x},${r.y}) is off its part`).toBe(true);
    }
    const [x0, y0, x1, y1] = g.bbox;
    expect(x0 >= 0 && y0 >= 0 && x1 <= 320 && y1 <= 240, `${g.bird} bird leaves the 320x240 frame: ${g.bbox.map(Math.round)}`).toBe(true);
  }
});

test('the sparrow shows its yellow lores, the mark the card calls diagnostic', async ({ page }) => {
  await mount(page, 1100);
  await page.getByRole('tab', { name: /White-throated Sparrow/ }).click();
  const fill = await page.evaluate(() => {
    const svg = document.querySelector('svg[aria-label*="clickable field-mark hotspots"]') as SVGSVGElement;
    return svg.querySelector('[data-part="lores"]')?.getAttribute('fill') || '';
  });
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(fill.slice(i, i + 2), 16));
  expect(r > 200 && g > 150 && b < 90, `lores fill ${fill} is not yellow`).toBe(true);
});

test('a ring click opens that field mark', async ({ page }) => {
  await mount(page, 1100);
  await page.getByRole('button', { name: 'Black cap' }).first().click();
  await expect(page.getByRole('heading', { name: 'Black cap' })).toBeVisible();
});

test('the diagram fits a 390px phone', async ({ page }) => {
  await mount(page, 390);
  const w = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, (document.querySelector('#wrap') as HTMLElement).scrollWidth));
  expect(w).toBeLessThanOrEqual(391);
  const g = await geometry(page);
  for (const r of g.rings) expect(r.inside, `${r.id} off its part at phone width`).toBe(true);
});
