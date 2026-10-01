/**
 * Bird Lab — Nest Box Guide: boxes and entrance holes drawn to scale.
 *
 * The guide's own line is "size matters — wrong dimensions = wrong species",
 * and it was all prose. Each box is now a front view to one scale for every
 * species, and every entrance hole sits side by side beside a U.S. quarter,
 * with the two thresholds that decide which non-native birds get in.
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
  await page.evaluate(() => (window as any).__mount({ birdLab: { view: 'nestbox' } }));
  await page.waitForSelector('[data-nestbox-box]');
}

// Published spec for each box: floor side, depth, hole (inches).
const SPEC: Record<string, { floor: number; depth: number; hole: number; holeH?: number }> = {
  'House Wren': { floor: 4, depth: 7, hole: 1 },
  'Eastern Bluebird': { floor: 4, depth: 8, hole: 1.5 },
  'Wood Duck': { floor: 10, depth: 24, hole: 4, holeH: 3 },
  'Northern Flicker': { floor: 7, depth: 18, hole: 2.5 },
  'American Kestrel': { floor: 8, depth: 14, hole: 3 },
};

test('each box is drawn to one scale, and switching species changes its size', async ({ page }) => {
  await mount(page);
  const scales: number[] = [];
  for (const [name, sp] of Object.entries(SPEC)) {
    await page.getByRole('button', { name, exact: true }).click();
    await expect(page.getByRole('button', { name, exact: true })).toHaveAttribute('aria-pressed', 'true');
    const m = await page.evaluate((n) => {
      const svg = document.querySelector(`[data-nestbox-box="${n}"]`) as SVGSVGElement;
      const front = svg.querySelector('[data-nestbox-front]') as SVGGraphicsElement;
      const hole = svg.querySelector('[data-nestbox-hole]') as SVGGraphicsElement;
      const foot = svg.querySelector('[data-nestbox-scale] path') as SVGGraphicsElement;
      const f = front.getBBox(), hb = hole.getBBox(), sc = foot.getBBox();
      return { w: f.width, h: f.height, hw: hb.width, hh: hb.height, foot: sc.width };
    }, name);
    const pxPerIn = m.foot / 12;
    scales.push(pxPerIn);
    expect(m.w / pxPerIn, `${name} floor`).toBeCloseTo(sp.floor, 1);
    expect(m.h / pxPerIn, `${name} depth`).toBeCloseTo(sp.depth, 1);
    expect(m.hw / pxPerIn, `${name} hole width`).toBeCloseTo(sp.hole, 1);
    expect(m.hh / pxPerIn, `${name} hole height`).toBeCloseTo(sp.holeH ?? sp.hole, 1);
  }
  for (const s of scales) expect(Math.abs(s / scales[0] - 1)).toBeLessThan(0.01);
});

test('every hole side by side, smallest first, with a quarter and the two thresholds', async ({ page }) => {
  await mount(page);
  const g = await page.evaluate(() => {
    const svg = document.querySelector('[data-nestbox-holes]') as SVGSVGElement;
    const q = svg.querySelector('[data-nestbox-quarter] circle') as SVGCircleElement;
    return {
      pxPerIn: Number(svg.getAttribute('data-px-per-in')),
      quarterD: q.getBBox().width,
      groups: [...svg.querySelectorAll('[data-nestbox-group]')].map((el) => {
        const e = el.querySelector('ellipse') as SVGGraphicsElement, b = e.getBBox();
        return { key: el.getAttribute('data-nestbox-group')!, names: el.getAttribute('data-names')!.split('|'), w: b.width, h: b.height,
          sparrow: el.getAttribute('data-sparrow'), starling: el.getAttribute('data-starling'), current: el.getAttribute('data-current') };
      }),
    };
  });
  // A U.S. quarter is 0.955 in across.
  expect(g.quarterD / g.pxPerIn).toBeCloseTo(0.955, 2);
  // All twelve species appear once; holes run smallest to largest by area.
  expect(g.groups.flatMap((x) => x.names).sort()).toHaveLength(12);
  const areas = g.groups.map((x) => x.w * x.h);
  for (let i = 1; i < areas.length; i++) expect(areas[i]).toBeGreaterThan(areas[i - 1]);
  const inches = (x: { w: number }) => x.w / g.pxPerIn;
  // A 1 1/8 in hole keeps out House Sparrows; a 1 1/2 in hole keeps out European Starlings.
  for (const x of g.groups) {
    expect(x.sparrow, `${x.key} sparrow`).toBe(inches(x) > 1.13 ? 'in' : 'out');
    expect(x.starling, `${x.key} starling`).toBe(inches(x) > 1.51 ? 'in' : 'out');
  }
  const wren = g.groups.find((x) => x.names.includes('House Wren'))!;
  const chick = g.groups.find((x) => x.names.includes('Black-capped Chickadee'))!;
  const blue = g.groups.find((x) => x.names.includes('Eastern Bluebird'))!;
  expect(wren.sparrow).toBe('out');
  expect(chick.sparrow).toBe('out');
  expect(blue.starling).toBe('out');
  expect(blue.names).toContain('Tree Swallow');
  // The species on screen is the one lit up in the strip.
  expect(g.groups.filter((x) => x.current === 'true').map((x) => x.names)).toEqual([['Eastern Bluebird', 'Tree Swallow']]);
  await page.getByRole('button', { name: 'Wood Duck', exact: true }).click();
  const lit = await page.evaluate(() => [...document.querySelectorAll('[data-nestbox-group][data-current="true"]')].map((e) => e.getAttribute('data-names')));
  expect(lit).toEqual(['Wood Duck']);
});

test('the hole strip stays readable on a phone', async ({ page }) => {
  await mount(page);
  await page.setViewportSize({ width: 390, height: 900 });
  await page.evaluate(() => { const w = document.querySelector('#wrap') as HTMLElement; w.style.width = '390px'; w.style.maxWidth = '390px'; });
  const r = await page.evaluate(() => {
    const svg = document.querySelector('[data-nestbox-holes]') as SVGSVGElement;
    const t = svg.querySelector('[data-nestbox-group] text') as SVGTextElement;
    return { font: t.getBoundingClientRect().height, doc: document.documentElement.scrollWidth };
  });
  expect(r.font).toBeGreaterThan(8);
  expect(r.doc).toBeLessThanOrEqual(390);
});
