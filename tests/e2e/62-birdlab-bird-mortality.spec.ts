/**
 * Bird Lab — Wind Energy + Birds: what kills US birds each year, to scale.
 *
 * Turbine deaths only make sense next to the other causes. The chart puts
 * every published yearly estimate on one scale where each gridline is ten
 * times the one before. These checks place every bar from its own numbers,
 * pin the numbers to the studies, and tie the turbine bar to the card text.
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
    (window as any).__mount({ birdLab: { view: 'windEnergy' } });
  }, width);
  await page.waitForSelector('[data-mort-chart]');
}

// Published US yearly estimates (towers: US + Canada).
const STUDY: Record<string, [number, number]> = {
  cats: [1.3e9, 4.0e9], // Loss, Will + Marra 2013, Nature Communications
  glass: [365e6, 988e6], // Loss and others 2014, The Condor
  cars: [89e6, 340e6], // Loss, Will + Marra 2014, J. Wildlife Management
  lines: [12e6, 64e6], // Loss, Will + Marra 2014, PLoS ONE
  towers: [6.8e6, 6.8e6], // Longcore and others 2012, PLoS ONE
  wind: [140000, 328000], // Loss, Will + Marra 2013, Biological Conservation
};

test('every bar sits over its own published range, on a x10 scale', async ({ page }) => {
  await mount(page);
  const got = await page.evaluate(() => {
    const svg = document.querySelector('[data-mort-chart]')!;
    return {
      x0: Number(svg.getAttribute('data-x0')), x1: Number(svg.getAttribute('data-x1')), e0: Number(svg.getAttribute('data-e0')), e1: Number(svg.getAttribute('data-e1')),
      rows: [...svg.querySelectorAll('[data-mort]')].map((g) => {
        const bar = g.querySelector('[data-mort-bar]')!;
        const box = bar.tagName === 'circle' ? { a: Number(bar.getAttribute('cx')), b: Number(bar.getAttribute('cx')) }
          : { a: Number(bar.getAttribute('x')), b: Number(bar.getAttribute('x')) + Number(bar.getAttribute('width')) };
        return { key: g.getAttribute('data-mort')!, lo: Number(g.getAttribute('data-lo')), hi: Number(g.getAttribute('data-hi')), ...box, text: g.textContent };
      }),
      card: [...document.querySelectorAll('h2')].map((h) => h.parentElement!.textContent).join(' '),
    };
  });
  const X = (n: number) => got.x0 + ((Math.log10(n) - got.e0) / (got.e1 - got.e0)) * (got.x1 - got.x0);
  expect(got.rows.map((r) => r.key)).toEqual(Object.keys(STUDY));
  for (const r of got.rows) {
    expect([r.lo, r.hi], r.key).toEqual(STUDY[r.key]);
    expect(r.a, `${r.key} start`).toBeCloseTo(X(r.lo), 0);
    if (r.lo !== r.hi) expect(r.b, `${r.key} end`).toBeCloseTo(X(r.hi), 0);
  }
  // Biggest killer first, turbines last; cats kill thousands of times more.
  for (let i = 1; i < got.rows.length; i++) expect(got.rows[i].hi).toBeLessThan(got.rows[i - 1].hi);
  expect(STUDY.cats[0] / STUDY.wind[1]).toBeGreaterThan(1000);
  expect(got.rows[0].text).toContain('1.3–4 billion');
  expect(got.rows[5].text).toContain('140,000 – 328,000');
  // The card text agrees with the turbine bar, and names the black-blade study.
  expect(got.card).toContain('140,000 to 330,000 bird deaths a year in the continental US');
  expect(got.card).toContain('Smøla wind farm in Norway');
});

test('no sideways scroll on a 390px phone', async ({ page }) => {
  await mount(page, 390);
  const over = await page.evaluate(() => {
    const wrap = document.querySelector('#wrap') as HTMLElement;
    return wrap.scrollWidth - wrap.clientWidth;
  });
  expect(over, 'horizontal overflow in px').toBeLessThanOrEqual(1);
});
