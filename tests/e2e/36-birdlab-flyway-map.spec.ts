/**
 * Bird Lab — Migration Patterns: a flyway map students can read.
 *
 * The old map was a hand-drawn blob (no Florida, Gulf, Mexico or Central
 * America), the four flyways were straight dashed lines, and the arrowhead
 * marker scaled with the 6px stroke into a 36-unit black triangle sitting over
 * the Atlantic coast. The map is now projected from real longitude/latitude.
 *
 * These checks ask geographic questions of the rendered SVG: is Maine on land,
 * does each flyway pass over the land it is named for, and does picking a
 * flyway actually change the highlighted route.
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
  await page.evaluate(() => (window as any).__mount({ birdLab: { view: 'migration' } }));
  await page.waitForSelector('[data-flyway-map]', { timeout: 30000 });
}

// Same projection the tool uses: lon -170..-50, lat 8..72 onto 440x300.
const proj = (lon: number, lat: number) => [(lon + 170) * 440 / 120, (72 - lat) * 300 / 64];

const onLand = (page: Page, pts: number[][]) => page.evaluate((points) => {
  const land = document.querySelector('[data-map="land"]') as SVGGeometryElement;
  const svg = land.ownerSVGElement as SVGSVGElement;
  return points.map(([x, y]) => { const p = svg.createSVGPoint(); p.x = x; p.y = y; return land.isPointInFill(p); });
}, pts);

test('the land is shaped like North America, with Maine on it', async ({ page }) => {
  await mount(page);
  const [maine, gulf, florida, pacific, hudson] = await onLand(page, [
    proj(-69.2, 45.3),   // Maine
    proj(-90, 25),       // Gulf of Mexico
    proj(-81.5, 28),     // Florida peninsula
    proj(-135, 40),      // Pacific
    proj(-86, 59),       // Hudson Bay
  ]);
  expect(maine, 'Maine is at sea').toBe(true);
  expect(florida, 'no Florida peninsula').toBe(true);
  expect(gulf, 'the Gulf of Mexico is land').toBe(false);
  expect(pacific, 'the Pacific is land').toBe(false);
  expect(hudson, 'Hudson Bay is land').toBe(false);
});

test('each flyway runs over the region it is named for', async ({ page }) => {
  await mount(page);
  const probes: Record<string, number[]> = {
    pacific: proj(-122, 42),       // Pacific coast states
    central: proj(-100, 42),       // Great Plains
    mississippi: proj(-90.5, 38),  // Mississippi valley
    atlantic: proj(-74.3, 39.5),   // mid-Atlantic coast
  };
  const near = await page.evaluate((pr) => {
    const out: Record<string, number> = {};
    for (const [id, [x, y]] of Object.entries(pr)) {
      const path = document.querySelector(`[data-flyway="${id}"]`) as SVGPathElement;
      const len = path.getTotalLength();
      let best = Infinity;
      for (let s = 0; s <= len; s += 2) { const p = path.getPointAtLength(s); best = Math.min(best, Math.hypot(p.x - x, p.y - y)); }
      out[id] = best;
    }
    return out;
  }, probes);
  for (const [id, d] of Object.entries(near)) expect(d, `${id} flyway misses its region by ${d.toFixed(1)}`).toBeLessThan(12);
});

test('picking a flyway highlights it, with a normal-sized arrowhead', async ({ page }) => {
  await mount(page);
  await expect(page.locator('[data-flyway-map]')).toHaveAttribute('data-flyway-map', 'atlantic');
  await page.getByRole('radio', { name: /Central Flyway/ }).click();
  await expect(page.locator('[data-flyway-map]')).toHaveAttribute('data-flyway-map', 'central');
  await expect(page.locator('[data-flyway="central"][data-active="true"]')).toHaveCount(1);
  const marker = await page.evaluate(() => {
    const m = document.querySelector('#fwArrow') as SVGMarkerElement;
    return { units: m.getAttribute('markerUnits'), w: Number(m.getAttribute('markerWidth')) };
  });
  expect(marker.units).toBe('userSpaceOnUse');
  expect(marker.w).toBeLessThanOrEqual(14);
});
