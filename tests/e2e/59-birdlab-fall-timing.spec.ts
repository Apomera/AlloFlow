/**
 * Bird Lab — Fall Migration Strategies: when each group moves, to scale.
 *
 * The first card says when shorebirds, songbirds, hawks and waterfowl pass
 * through Maine, each with a peak. A chart now draws those windows from July to
 * December. These checks read the card on the page, work out each window's
 * days (early = 1-10, mid = 11-20, late = 21 to the end), and measure the bars.
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
    (window as any).__mount({ birdLab: { view: 'fallMig' } });
  }, width);
  await page.waitForSelector('[data-fall-timing]');
}

const LEN = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const MON = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const first = (m: number) => LEN.slice(0, m).reduce((a, b) => a + b, 0);
function side(t: string, end: boolean) {
  const w = t.trim().toLowerCase().replace('-', ' ').split(' ');
  const q = ['early', 'mid', 'late'].includes(w[0]) ? w.shift() : null;
  const m = MON.indexOf(w[0].slice(0, 3));
  const s = first(m), n = LEN[m];
  if (q === 'early') return end ? s + 9 : s;
  if (q === 'mid') return end ? s + 19 : s + 10;
  if (q === 'late') return end ? s + n - 1 : s + 20;
  return end ? s + n - 1 : s;
}
function range(t: string) {
  const p = t.split(/ to | through /);
  const q = p.length === 1 && /^[A-Za-z]+-[A-Za-z]+$/.test(t) && !/^(early|mid|late)-/i.test(t) ? t.split('-') : p;
  return [side(q[0], false), side(q[q.length - 1], true)];
}

test('each group is drawn over the days its card gives', async ({ page }) => {
  await mount(page);
  const got = await page.evaluate(() => {
    const svg = document.querySelector('[data-fall-timing]') as SVGSVGElement;
    const card = [...document.querySelectorAll('h2')].find((h) => h.textContent!.includes('When does fall migration begin?'))!.parentElement!.textContent!;
    return {
      card,
      x0: Number(svg.getAttribute('data-x0')), x1: Number(svg.getAttribute('data-x1')), d0: Number(svg.getAttribute('data-d0')), d1: Number(svg.getAttribute('data-d1')),
      rows: [...svg.querySelectorAll('[data-fall-row]')].map((g) => {
        const box = (sel: string) => { const r = g.querySelector(sel) as SVGRectElement | null; return r ? [Number(r.getAttribute('x')), Number(r.getAttribute('x')) + Number(r.getAttribute('width'))] : null; };
        return { name: g.getAttribute('data-fall-row')!, win: box('[data-fall-bar="window"]')!, peak: box('[data-fall-bar="peak"]') };
      }),
    };
  });
  const X = (d: number) => got.x0 + ((d - got.d0) / (got.d1 - got.d0)) * (got.x1 - got.x0);
  // The card, as a reader sees it.
  const line = /Details: (.*?)📍/.exec(got.card)![1];
  const want = line.split(/\.\s+/).map((seg) => {
    const m = /^([^:]+):\s*(.*?)\.?$/.exec(seg.trim())!;
    const pk = /\(peak ([^)]+)\)/.exec(m[2]);
    return { name: m[1], win: range(m[2].replace(/\s*\(.*\)/, '')), peak: pk ? range(pk[1]) : null };
  });
  expect(want.map((w) => w.name)).toEqual(['Shorebirds', 'Songbirds', 'Hawks', 'Waterfowl']);
  expect(got.rows.map((r) => r.name)).toEqual(want.map((w) => w.name));
  for (const w of want) {
    const r = got.rows.find((x) => x.name === w.name)!;
    expect(r.win[0], `${w.name} start`).toBeCloseTo(X(w.win[0]), 1);
    expect(r.win[1], `${w.name} end`).toBeCloseTo(X(w.win[1] + 1), 1);
    if (w.peak) {
      expect(r.peak![0], `${w.name} peak start`).toBeCloseTo(X(w.peak[0]), 1);
      expect(r.peak![1], `${w.name} peak end`).toBeCloseTo(X(w.peak[1] + 1), 1);
      // A peak sits inside its window.
      expect(r.peak![0]).toBeGreaterThanOrEqual(r.win[0] - 0.01);
      expect(r.peak![1]).toBeLessThanOrEqual(r.win[1] + 0.01);
    } else expect(r.peak, `${w.name} has no peak`).toBeNull();
  }
  // Spot checks in days: shorebirds from 21 July, hawks from 21 August, songbirds to 30 November.
  expect(want[0].win[0]).toBe(first(6) + 20);
  expect(want[2].win[0]).toBe(first(7) + 20);
  expect(want[1].win[1]).toBe(first(10) + 29);
});

test('the chart agrees with the lab\'s other fall dates', async ({ page }) => {
  await mount(page);
  const text = await page.evaluate(() => document.body.textContent!);
  // Shorebird peak = the Shorebird stopover card; hawk window = Cadillac's season.
  expect(text).toContain('Shorebirds: late July to October (peak mid-Aug to mid-Sept)');
  expect(text).toContain('Maine shorebird peak mid-Aug to mid-Sept');
  expect(text).toContain('Hawks: late August to October (peak September)');
  expect(text).toContain('Cadillac Mountain Hawk Watch (Acadia): late Aug to Oct');
  expect(text).toContain('from late July (the first shorebirds) through November (the last waterfowl)');
});

test('no sideways scroll on a 390px phone', async ({ page }) => {
  await mount(page, 390);
  const over = await page.evaluate(() => {
    const wrap = document.querySelector('#wrap') as HTMLElement;
    return wrap.scrollWidth - wrap.clientWidth;
  });
  expect(over, 'horizontal overflow in px').toBeLessThanOrEqual(1);
});
