/**
 * Bird Lab — timelines drawn to scale from the lab's own dates.
 *
 * Bird Evolution listed nine events as cards and Historically Extinct Birds
 * eight species as cards; neither showed how the dates sit against each other.
 * Both now open with a timeline. These checks place every marker from its
 * date, and pin the deep-time events against the geologic periods: the K-Pg
 * extinction on the Cretaceous/Paleogene boundary, Archaeopteryx in the
 * Jurassic, the last two events inside the Quaternary.
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

async function mount(page: Page, view: string, sel: string) {
  await page.goto(`${(harness as any).base}/__harness`);
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.birdLab, null, { timeout: 30000 });
  await page.evaluate((v) => (window as any).__mount({ birdLab: { view: v } }), view);
  await page.waitForSelector(sel);
}

const read = (page: Page, kind: string) => page.evaluate((k) => {
  const svg = document.querySelector(`[data-timeline="${k}"]`) as SVGSVGElement;
  const items = [...svg.querySelectorAll('[data-timeline-item]')].map((g) => ({
    key: g.getAttribute('data-timeline-item')!, n: Number(g.getAttribute('data-n')), x: Number(g.getAttribute('data-x')), cls: g.getAttribute('data-maine-class') }));
  const bands = Object.fromEntries([...svg.querySelectorAll('[data-period]')].map((r) => {
    const b = (r as SVGGraphicsElement).getBBox(); return [r.getAttribute('data-period'), { a: b.x, b: b.x + b.width }];
  }));
  const legend = [...document.querySelectorAll(`[data-timeline-legend="${k}"] li`)].map((li) => li.textContent!.trim());
  return { x0: Number(svg.getAttribute('data-x0')), x1: Number(svg.getAttribute('data-x1')), items, bands, legend };
}, kind);

test('evolution: every event at its date, against the geologic periods', async ({ page }) => {
  await mount(page, 'evolution', '[data-timeline="deep"]');
  const t = await read(page, 'deep');
  expect(t.items.length).toBe(11);
  const at = (ma: number) => t.x0 + (170 - ma) / 170 * (t.x1 - t.x0);
  const want: Record<string, number> = { 'First feathered dinosaurs': 160, 'Archaeopteryx': 150, 'Modern bird ancestor group': 125, 'K-Pg extinction event': 66,
    'Rapid bird radiation': 65, 'Songbird radiation begins': 50, 'Hummingbird ancestors': 40, 'Modern bird species recognizable': 1, 'Late Pleistocene bird die-off': 0.015,
    'Historic extinctions begin': 0.0005, '~11,000 living species': 0 };
  for (const it of t.items) expect(it.x, it.key).toBeCloseTo(at(want[it.key]), 0);
  const x = Object.fromEntries(t.items.map((it) => [it.key, it.x]));
  // The K-Pg extinction sits on the Cretaceous/Paleogene boundary.
  expect(Math.abs(x['K-Pg extinction event'] - t.bands.Cretaceous.b)).toBeLessThan(1);
  expect(Math.abs(t.bands.Cretaceous.b - t.bands.Paleogene.a)).toBeLessThan(0.5);
  expect(x['Archaeopteryx']).toBeLessThan(t.bands.Jurassic.b);
  expect(x['Modern bird ancestor group']).toBeGreaterThan(t.bands.Cretaceous.a);
  for (const k of ['Modern bird species recognizable', 'Late Pleistocene bird die-off', 'Historic extinctions begin', '~11,000 living species']) expect(x[k], k).toBeGreaterThan(t.bands.Quaternary.a);
  // Numbered bubbles match the numbered list, oldest first.
  expect(t.items.map((i) => i.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  expect(t.legend[0]).toContain('160 million years ago');
  expect(t.legend[8]).toContain('15,000 years ago');
  expect(t.legend[10]).toContain('Today');
});

test('extinct birds: each at the year last seen, colored by its Maine link', async ({ page }) => {
  await mount(page, 'extinct', '[data-timeline="extinct"]');
  const t = await read(page, 'extinct');
  expect(t.items.length).toBe(8);
  const at = (y: number) => t.x0 + (y - 1650) / (2030 - 1650) * (t.x1 - t.x0);
  const year: Record<string, number> = { Dodo: 1662, 'Great Auk': 1844, 'Labrador Duck': 1875, 'Passenger Pigeon': 1914, 'Carolina Parakeet': 1918,
    'Heath Hen': 1932, 'Eskimo Curlew': 1962, "Bachman's Warbler": 1962 };
  const name = (k: string) => k.replace(/\s*\(.*\)\s*$/, '');
  for (const it of t.items) expect(it.x, it.key).toBeCloseTo(at(year[name(it.key)]), 0);
  const cls = Object.fromEntries(t.items.map((it) => [name(it.key), it.cls]));
  for (const n of ['Great Auk', 'Passenger Pigeon', 'Labrador Duck', 'Eskimo Curlew']) expect(cls[n], n).toBe('maine');
  for (const n of ['Carolina Parakeet', 'Heath Hen']) expect(cls[n], n).toBe('maybe');
  for (const n of ['Dodo', "Bachman's Warbler"]) expect(cls[n], n).toBe('never');
  expect(t.legend.map((l, i) => l.slice(String(i + 1).length).trim())).toEqual(['1662 Dodo', '1844 Great Auk', '1875 Labrador Duck', '1914 Passenger Pigeon',
    '1918 Carolina Parakeet', '1932 Heath Hen', '1962 Eskimo Curlew', "1962 Bachman's Warbler"]);
  await expect(page.getByText('4 of the 8 once lived in or passed through Maine.')).toBeVisible();
});
