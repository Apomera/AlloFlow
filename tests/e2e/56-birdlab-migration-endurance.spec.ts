/**
 * Bird Lab — Migration Deep Science: endurance records to scale.
 *
 * The Endurance Records tab gave four distances in prose. It now draws each as
 * a bar beside once and twice around the Earth (24,901 miles at the equator).
 * These checks read each distance from the tab's own text on the page, measure
 * the bars, and keep the godwit's single nonstop flight apart from the year-long
 * round trips.
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

async function mount(page: Page, width = 1100) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(`${(harness as any).base}/__harness`);
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.birdLab, null, { timeout: 30000 });
  await page.evaluate((w) => {
    (document.querySelector('#wrap') as HTMLElement).style.width = w + 'px';
    (window as any).__mount({ birdLab: { view: 'migrationDeep' } });
  }, width);
  await page.getByRole('button', { name: 'Endurance Records', exact: true }).waitFor();
}

const EARTH = 24901;

test('each record is a bar of its own miles, beside once and twice around the Earth', async ({ page }) => {
  await mount(page);
  // Not on the other tabs.
  expect(await page.locator('[data-endurance-chart]').count()).toBe(0);
  const tab = page.getByRole('button', { name: 'Endurance Records', exact: true });
  await tab.click();
  await expect(tab).toHaveAttribute('aria-pressed', 'true');
  await page.waitForSelector('[data-endurance-chart]');
  const got = await page.evaluate(() => {
    const svg = document.querySelector('[data-endurance-chart]') as SVGSVGElement;
    const card = svg.closest('figure')!.parentElement!.textContent!;
    return {
      x0: Number(svg.getAttribute('data-x0')), x1: Number(svg.getAttribute('data-x1')), max: Number(svg.getAttribute('data-max')),
      earth: [...svg.querySelectorAll('[data-earth]')].map((p) => Number(p.getAttribute('d')!.split(' ')[1])),
      rows: [...svg.querySelectorAll('[data-endurance]')].map((g) => {
        const bar = g.querySelector('[data-endurance-bar]') as SVGRectElement;
        return { name: g.getAttribute('data-endurance')!, x: Number(bar.getAttribute('x')), w: Number(bar.getAttribute('width')),
          dashed: !!bar.getAttribute('stroke-dasharray'), label: g.querySelector('[data-endurance-label]')!.textContent, sub: g.textContent };
      }),
      card,
    };
  });
  const X = (mi: number) => got.x0 + mi / got.max * (got.x1 - got.x0);
  // Distances as the tab's prose states them.
  const miles = (re: RegExp) => Number(re.exec(got.card)![1].replace(/,/g, ''));
  const want: Record<string, number> = {
    'Arctic Tern': miles(/Arctic Tern annual ~([\d,]+) miles/),
    'Red Knot': miles(/round-trip ~([\d,]+) miles/),
    'Bobolink': miles(/Bobolink migrates to Argentina \(~([\d,]+) miles round trip\)/),
    'Bar-tailed Godwit': miles(/about ([\d,]+) miles \([\d,]+ km\) nonstop/),
  };
  expect(want).toEqual({ 'Arctic Tern': 44000, 'Red Knot': 20000, 'Bobolink': 12000, 'Bar-tailed Godwit': 8400 });
  expect(got.rows.map((r) => r.name)).toEqual(['Arctic Tern', 'Red Knot', 'Bobolink', 'Bar-tailed Godwit']);
  for (const r of got.rows) {
    expect(r.x, r.name).toBe(got.x0);
    expect(r.x + r.w, r.name).toBeCloseTo(X(want[r.name]), 1);
    expect(r.dashed, `${r.name} dashed only if nonstop`).toBe(r.name === 'Bar-tailed Godwit');
  }
  expect(got.earth[0]).toBeCloseTo(X(EARTH), 1);
  expect(got.earth[1]).toBeCloseTo(X(2 * EARTH), 1);
  const by = Object.fromEntries(got.rows.map((r) => [r.name, r]));
  // The tern passes once around but not twice; the knot falls short of once.
  expect(by['Arctic Tern'].x + by['Arctic Tern'].w).toBeGreaterThan(got.earth[0]);
  expect(by['Arctic Tern'].x + by['Arctic Tern'].w).toBeLessThan(got.earth[1]);
  expect(by['Red Knot'].x + by['Red Knot'].w).toBeLessThan(got.earth[0]);
  expect(by['Arctic Tern'].label).toBe('44,000 mi · 1.8 times around the Earth');
  expect(by['Red Knot'].label).toBe('20,000 mi · 80% of the way around the Earth');
  expect(by['Bobolink'].label).toBe('12,000 mi · 48% of the way around the Earth');
  expect(by['Bar-tailed Godwit'].label).toBe('8,400 mi · 34% of the way around the Earth');
  expect(by['Bar-tailed Godwit'].sub).toContain('One nonstop flight');
  expect(by['Red Knot'].sub).toContain('Round trip in a year');
});

test('no sideways scroll on a 390px phone', async ({ page }) => {
  await mount(page, 390);
  await page.getByRole('button', { name: 'Endurance Records', exact: true }).click();
  await page.waitForSelector('[data-endurance-chart]');
  const over = await page.evaluate(() => {
    const wrap = document.querySelector('#wrap') as HTMLElement;
    return wrap.scrollWidth - wrap.clientWidth;
  });
  expect(over, 'horizontal overflow in px').toBeLessThanOrEqual(1);
});
