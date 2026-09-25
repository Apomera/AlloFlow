/**
 * Bird Lab — Detailed Birding Calendar as a year wheel.
 *
 * Eighteen windows ("Late March — early April", "Mid-May", "June" ...) were a
 * list of cards. They are now arcs on a year wheel, January at the top, each
 * numbered to match its card. These checks work each window's dates out from
 * its own words and find the arc there.
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
  await page.evaluate(() => (window as any).__mount({ birdLab: { view: 'detCalendar' } }));
  await page.waitForSelector('[data-cal-wheel]');
}

// Day of year (0 = 1 January) where a phrase starts and ends: early = days
// 1-10 of the month, mid = 11-20, late = 21 to the end.
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const LEN = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const first = (m: number) => LEN.slice(0, m).reduce((a, b) => a + b, 0);
function range(phrase: string) {
  const p = phrase.toLowerCase().replace('-', ' ');
  const m = MONTHS.findIndex((x) => p.includes(x));
  const q = p.startsWith('early') ? [0, 9] : p.startsWith('mid') ? [10, 19] : p.startsWith('late') ? [20, LEN[m] - 1] : [0, LEN[m] - 1];
  return [first(m) + q[0], first(m) + q[1]];
}
function expected(win: string) {
  const [a, b] = win.split(' — ');
  const from = range(a)[0], to = range(b || a)[1];
  return { from, len: ((to - from + 365) % 365) + 1 };
}

test('every window sits on the wheel over its own dates, numbered like its card', async ({ page }) => {
  await mount(page);
  const w = await page.evaluate(() => {
    const svg = document.querySelector('[data-cal-wheel]') as SVGSVGElement;
    const cx = Number(svg.getAttribute('data-center')), cy = cx;
    return [...svg.querySelectorAll('[data-cal-window]')].map((g) => {
      const c = g.querySelector('circle') as SVGCircleElement;
      const x = Number(c.getAttribute('cx')) - cx, y = Number(c.getAttribute('cy')) - cy;
      let ang = Math.atan2(y, x) + Math.PI / 2; if (ang < 0) ang += 2 * Math.PI;
      return { win: g.getAttribute('data-cal-window')!, n: Number(g.getAttribute('data-n')), from: Number(g.getAttribute('data-from')),
        len: Number(g.getAttribute('data-len')), season: g.getAttribute('data-season'), track: Number(g.getAttribute('data-track')), day: ang / (2 * Math.PI) * 365 };
    });
  });
  expect(w.length).toBe(18);
  for (const it of w) {
    const e = expected(it.win);
    expect(it.from, it.win).toBe(e.from);
    expect(it.len, it.win).toBe(e.len);
    // The number sits at the middle of its arc.
    const mid = (e.from + e.len / 2) % 365, d = Math.abs(it.day - mid);
    expect(Math.min(d, 365 - d), `${it.win} number`).toBeLessThan(2);
  }
  const by = Object.fromEntries(w.map((it) => [it.win, it]));
  expect(by['Mid-May'].season).toBe('spring');
  expect(by['July'].season).toBe('summer');
  expect(by['Mid-September'].season).toBe('fall');
  expect(by['Mid-December — early January'].season).toBe('winter');
  // Overlapping windows ride the inner ring.
  expect(by['June'].track).toBe(1);
  expect(by['Late January — February'].track).toBe(1);
  expect(by['Mid-March'].track).toBe(0);
  // Cards carry the same numbers.
  const cards = await page.$$eval('[data-cal-card]', (els) => els.map((e) => e.textContent!.trim()));
  expect(cards.length).toBe(18);
  for (const it of w) expect(cards[it.n - 1], it.win).toContain(`${it.n} · ${it.win}`);
});
