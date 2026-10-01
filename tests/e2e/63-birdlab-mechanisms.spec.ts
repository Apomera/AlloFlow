/**
 * Bird Lab — mechanisms drawn: a gull's leg on ice, a fall cold front, and
 * the hawkwatch winds on the Hawkwatch guide.
 *
 * Countercurrent exchange only works if, at every height, the artery going
 * down is warmer than the vein coming up; the checks read the drawn blood
 * colours to prove it. The front map is checked by geometry: every wind,
 * the hawks and the rain on the correct side of the front.
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

async function mount(page: Page, view: string, sel: string, width = 1100) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(`${(harness as any).base}/__harness`);
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.birdLab, null, { timeout: 30000 });
  await page.evaluate(({ v, w }) => {
    (document.querySelector('#wrap') as HTMLElement).style.width = w + 'px';
    (window as any).__mount({ birdLab: { view: v } });
  }, { v: view, w: width });
  await page.waitForSelector(sel);
}

// Warmth from a drawn blood colour: red (warm) to blue (cold).
const warmth = (rgb: string) => { const [r, , b] = rgb.match(/\d+/g)!.map(Number); return r - b; };

test('the artery is warmer than the vein beside it all the way down the leg', async ({ page }) => {
  await mount(page, 'thermo', '[data-thermo-leg]');
  const got = await page.evaluate(() => {
    const seg = (sel: string) => [...document.querySelectorAll(sel)].map((p) => ({
      y: Number(p.getAttribute('d')!.split(' ')[2]), c: p.getAttribute('stroke')! }));
    return { artery: seg('[data-thermo-artery]'), vein: seg('[data-thermo-vein]'),
      heat: document.querySelectorAll('[data-thermo-heat]').length, loss: document.querySelectorAll('[data-thermo-contrast] [data-thermo-loss]').length,
      caption: document.querySelector('[data-thermo-leg]')!.closest('figure')!.textContent };
  });
  expect(got.artery.length).toBe(8);
  expect(got.vein.length).toBe(8);
  for (let i = 1; i < 8; i++) {
    // Down the leg the artery cools; up the leg the vein warms.
    expect(warmth(got.artery[i].c)).toBeLessThan(warmth(got.artery[i - 1].c));
    expect(warmth(got.vein[i - 1].c)).toBeGreaterThan(warmth(got.vein[i].c));
  }
  // At every height heat can only flow artery -> vein.
  for (let i = 0; i < 8; i++) expect(warmth(got.artery[i].c), `height ${i}`).toBeGreaterThan(warmth(got.vein[i].c));
  // The blood back at the body is far warmer than at the foot.
  expect(warmth(got.vein[0].c)).toBeGreaterThan(warmth(got.vein[7].c) + 200);
  expect(got.heat).toBeGreaterThan(0);
  expect(got.loss).toBe(3);
  expect(got.caption).toContain('Countercurrent heat exchange');
  expect(got.caption).toContain('Foot just above freezing');
});

test('the cold front map puts winds, hawks and rain on the right sides', async ({ page }) => {
  await mount(page, 'weather', '[data-wx-map]');
  const got = await page.evaluate(() => {
    const svg = document.querySelector('[data-wx-map]')!;
    const xy = (s: string) => s.split(',').map(Number);
    // Each arrow from its drawn shaft tail and head tip: where it sits and
    // which way it blows (the wind comes FROM the opposite way).
    const arrow = (g: Element) => {
      const [shaft, head] = [...g.querySelectorAll('path')].map((p) => p.getAttribute('d')!.split(/[ MLZ]+/).filter(Boolean).map(Number));
      const [x1, y1, x2, y2] = [shaft[0], shaft[1], head[0], head[1]];
      const to = (Math.atan2(x2 - x1, -(y2 - y1)) * 180) / Math.PI;
      return { from: Math.round((to + 180 + 360) % 360), at: [(x1 + x2) / 2, (y1 + y2) / 2] };
    };
    const winds = [...svg.querySelectorAll('[data-wx-wind]')].filter((g) => !g.closest('[data-wx-motion]')).map(arrow);
    const tris = [...svg.querySelectorAll('[data-wx-tri]')].map((p) => p.getAttribute('d')!.split(/[ MLZ]+/).filter(Boolean).map(Number));
    const rain = [...svg.querySelectorAll('[data-wx-rain] path')].map((p) => p.getAttribute('d')!.split(' ').slice(1, 3).map(Number));
    return { front: xy(svg.getAttribute('data-front')!), winds, rain,
      motion: arrow(svg.querySelector('[data-wx-motion] [data-wx-wind]')!).from, tris,
      kettle: ((e) => [Number(e.getAttribute('cx')), Number(e.getAttribute('cy'))])(svg.querySelector('[data-wx-kettle] ellipse')!),
      fallout: svg.querySelector('[data-wx-fallout] path')!.getAttribute('d')!.split(' ').slice(1, 3).map(Number),
      cards: document.body.textContent! };
  });
  const [ax, ay, bx, by] = got.front;
  // Positive = ahead (southeast of the front), negative = behind.
  const side = (x: number, y: number) => (bx - ax) * (y - ay) - (by - ay) * (x - ax);
  const dist = (x: number, y: number) => Math.abs(side(x, y)) / Math.hypot(bx - ax, by - ay);
  // The front runs southwest-northeast and moves southeast (wind "from" northwest).
  expect(bx).toBeGreaterThan(ax);
  expect(by).toBeLessThan(ay);
  expect(got.motion).toBe(315);
  // Every triangle on the front points ahead, the way it moves.
  expect(got.tris.length).toBeGreaterThan(4);
  for (const t of got.tris) expect(side(t[4], t[5]), 'triangle apex ahead').toBeGreaterThan(0);
  const behind = got.winds.filter((w) => side(w.at[0], w.at[1]) < 0), ahead = got.winds.filter((w) => side(w.at[0], w.at[1]) > 0);
  expect(behind.length).toBeGreaterThanOrEqual(3);
  expect(ahead.length).toBeGreaterThanOrEqual(3);
  for (const w of behind) expect(w.from, 'northwest behind').toBe(315);
  for (const w of ahead) { expect(w.from).toBeGreaterThanOrEqual(180); expect(w.from).toBeLessThanOrEqual(225); }
  expect(side(got.kettle[0], got.kettle[1]), 'hawks behind the front').toBeLessThan(0);
  expect(side(got.fallout[0], got.fallout[1]), 'fallout at the front').toBeGreaterThan(0);
  expect(dist(got.fallout[0], got.fallout[1])).toBeLessThan(60);
  for (const [x, y] of got.rain) { expect(side(x, y)).toBeGreaterThan(0); expect(dist(x, y)).toBeLessThan(40); }
  // The cards say the same.
  expect(got.cards).toContain('Hawkwatching peaks on the clear, northwest-wind days after a cold front passes');
  expect(got.cards).toContain('Fall migration peaks on northwest wind nights');
});

test('the Hawkwatch guide shows the same winds as the hawkwatch data', async ({ page }) => {
  await mount(page, 'hawkwatch', '[data-hawk-winds]');
  const froms = await page.evaluate(() => Object.fromEntries(['spring', 'fall'].map((s) =>
    [s, [...document.querySelectorAll(`[data-hawk-compass="${s}"] [data-hawk-wind]`)].map((g) => Number(g.getAttribute('data-hawk-wind'))).sort((a, b) => a - b)])));
  expect(froms).toEqual({ spring: [180, 225], fall: [315] });
});

for (const [view, sel] of [['thermo', '[data-thermo-leg]'], ['weather', '[data-wx-map]'], ['hawkwatch', '[data-hawk-winds]']] as const) {
  test(`no sideways scroll on a 390px phone: ${view}`, async ({ page }) => {
    await mount(page, view, sel, 390);
    const over = await page.evaluate(() => {
      const wrap = document.querySelector('#wrap') as HTMLElement;
      return wrap.scrollWidth - wrap.clientWidth;
    });
    expect(over, 'horizontal overflow in px').toBeLessThanOrEqual(1);
  });
}
