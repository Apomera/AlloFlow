/**
 * Bird Lab — Hawkwatch Science Data: why the wind decides a hawkwatch.
 *
 * Two compasses draw the winds named in the page's own "Conditions" lines:
 * spring hawks bound northeast get south and southwest winds at their backs;
 * fall hawks bound southwest meet northwest winds side-on, which drift them to
 * the coast. A year strip draws each count's season. These checks take the wind
 * words from the page, measure every arrow's bearing, and place the seasons.
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
    (window as any).__mount({ birdLab: { view: 'hawkData' } });
  }, width);
  await page.waitForSelector('[data-hawk-winds]');
}

const DIRS: Record<string, number> = { north: 0, northeast: 45, east: 90, southeast: 135, south: 180, southwest: 225, west: 270, northwest: 315 };
// Compass bearing of travel from (x1,y1) to (x2,y2) on screen (y down).
const bearing = (x1: number, y1: number, x2: number, y2: number) => ((Math.atan2(x2 - x1, -(y2 - y1)) * 180) / Math.PI + 360) % 360;
const gap = (a: number, b: number) => { const d = Math.abs(a - b) % 360; return Math.min(d, 360 - d); };

async function read(page: Page) {
  return page.evaluate(() => {
    // An arrow is a shaft then a head: [shaft start x, y, arrow TIP x, y].
    const seg = (g: Element) => {
      const [shaft, head] = [...g.querySelectorAll('path')].map((p) => p.getAttribute('d')!.split(/[ MLZ]+/).filter(Boolean).map(Number));
      return [shaft[0], shaft[1], head[0], head[1]];
    };
    const dial = (season: string) => {
      const g = document.querySelector(`[data-hawk-compass="${season}"]`)!;
      const c = g.querySelector('circle')!;
      return {
        cx: Number(c.getAttribute('cx')), cy: Number(c.getAttribute('cy')), r: Number(c.getAttribute('r')),
        winds: [...g.querySelectorAll('[data-hawk-wind]')].map(seg),
        heading: seg(g.querySelector('[data-hawk-heading]')!),
        drift: g.querySelector('[data-hawk-drift]') ? seg(g.querySelector('[data-hawk-drift]')!) : null,
        coast: g.querySelector('[data-hawk-coast]')?.getAttribute('d')!.split(/[ ML]+/).filter(Boolean).map(Number) || null,
      };
    };
    const svg = document.querySelector('[data-hawk-winds]')!;
    const cards = [...document.querySelectorAll('h2')].filter((h) => h.textContent!.includes('📊')).map((h) => h.parentElement!.textContent!);
    return {
      spring: dial('spring'), fall: dial('fall'), cards,
      x0: Number(svg.getAttribute('data-x0')), x1: Number(svg.getAttribute('data-x1')),
      seasons: Object.fromEntries([...svg.querySelectorAll('[data-hawk-season], [data-hawk-peak]')].map((g) => {
        const r = g.querySelector('rect, path')!;
        const b = (r as SVGGraphicsElement).getBBox();
        return [(g.getAttribute('data-hawk-season') || 'peak:' + g.getAttribute('data-hawk-peak')), { a: b.x, b: b.x + b.width }];
      })),
    };
  });
}

// The directions a card's "Conditions" line names before "winds".
function named(card: string) {
  const m = /Conditions: .*?([a-z ]+?) winds/i.exec(card)!;
  return m[1].toLowerCase().split(' ').filter((w) => w in DIRS).map((w) => DIRS[w]).sort((a, b) => a - b);
}

test('each wind arrow comes from the direction its card names', async ({ page }) => {
  await mount(page);
  const t = await read(page);
  const springCard = t.cards.find((c) => /Bradbury/.test(c))!, fallCard = t.cards.find((c) => /Cadillac/.test(c))!;
  expect(named(springCard)).toEqual([180, 225]);
  expect(named(fallCard)).toEqual([315]);
  for (const [d, card] of [[t.spring, springCard], [t.fall, fallCard]] as const) {
    const from = d.winds.map((w) => (bearing(w[0], w[1], w[2], w[3]) + 180) % 360).sort((a, b) => a - b);
    expect(from.map(Math.round)).toEqual(named(card));
    for (const w of d.winds) {
      // Each arrow starts outside the dial and its tip stops at the rim.
      expect(Math.hypot(w[0] - d.cx, w[1] - d.cy)).toBeGreaterThan(d.r + 20);
      expect(Math.hypot(w[2] - d.cx, w[3] - d.cy) - d.r).toBeGreaterThan(-1);
      expect(Math.hypot(w[2] - d.cx, w[3] - d.cy) - d.r).toBeLessThan(10);
    }
  }
});

test('spring winds push the hawks along; fall winds push them sideways onto the coast', async ({ page }) => {
  await mount(page);
  const t = await read(page);
  const head = (d: typeof t.spring) => bearing(d.heading[0], d.heading[1], d.heading[2], d.heading[3]);
  const travel = (w: number[]) => bearing(w[0], w[1], w[2], w[3]);
  expect(head(t.spring)).toBeCloseTo(45, 0);
  expect(head(t.fall)).toBeCloseTo(225, 0);
  // Spring: every named wind has a tailwind component (within 45 degrees of the heading).
  for (const w of t.spring.winds) expect(gap(travel(w), head(t.spring))).toBeLessThanOrEqual(45);
  expect(Math.min(...t.spring.winds.map((w) => gap(travel(w), head(t.spring))))).toBeLessThan(1);
  expect(t.spring.drift).toBeNull();
  // Fall: the northwest wind crosses the heading at a right angle.
  for (const w of t.fall.winds) expect(gap(travel(w), head(t.fall))).toBeCloseTo(90, 0);
  // The drift runs with that wind, toward the shore, and stops at it.
  const d = t.fall.drift!;
  expect(gap(bearing(d[0], d[1], d[2], d[3]), travel(t.fall.winds[0]))).toBeLessThan(1);
  const c = t.fall.coast!;
  const toLine = (x: number, y: number) => Math.abs((c[2] - c[0]) * (c[1] - y) - (c[0] - x) * (c[3] - c[1])) / Math.hypot(c[2] - c[0], c[3] - c[1]);
  expect(toLine(t.fall.cx, t.fall.cy)).toBeCloseTo(t.fall.r / 2, 0);
  expect(toLine(d[2], d[3])).toBeLessThan(5);
  // The shore runs southwest-northeast.
  expect(gap(bearing(c[0], c[1], c[2], c[3]) % 180, 45)).toBeLessThan(1);
});

test('the year strip puts each count in its season', async ({ page }) => {
  await mount(page);
  const t = await read(page);
  const X = (day: number) => t.x0 + (day / 365) * (t.x1 - t.x0);
  // Bradbury: the card's own "(Mar 15–May 15)".
  expect(t.cards.find((c) => /Bradbury/.test(c))).toMatch(/Mar 15–May 15/);
  expect(t.seasons.Bradbury.a).toBeCloseTo(X(59 + 14), 1);
  expect(t.seasons.Bradbury.b).toBeCloseTo(X(120 + 15), 1);
  // Cadillac: late August through October (Hawkwatch guide), peak mid-September.
  expect(t.seasons.Cadillac.a).toBeCloseTo(X(212 + 20), 1);
  expect(t.seasons.Cadillac.b).toBeCloseTo(X(304), 1);
  expect(t.cards.find((c) => /Cadillac/.test(c))).toMatch(/peak in mid-September/);
  expect(t.seasons['peak:Cadillac'].a).toBeCloseTo(X(243 + 10), 1);
  expect(t.seasons['peak:Cadillac'].b).toBeCloseTo(X(243 + 20), 1);
});

test('no sideways scroll on a 390px phone', async ({ page }) => {
  await mount(page, 390);
  const over = await page.evaluate(() => {
    const wrap = document.querySelector('#wrap') as HTMLElement;
    return wrap.scrollWidth - wrap.clientWidth;
  });
  expect(over, 'horizontal overflow in px').toBeLessThanOrEqual(1);
});
