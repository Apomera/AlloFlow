/**
 * Bird Lab — Conservation Recovery Stories: fewest birds to today, to scale.
 *
 * Seven recoveries sit on one chart where each gridline is ten times the one
 * before, so 21 -> 700 pairs and 417 -> 70,000 pairs can be compared. These
 * checks take each count from the story cards on the page, place it on the
 * scale, and measure the dots. Brown Pelican (its two counts cover different
 * areas) and Eastern Bluebird (a percent, not a count) must stay off.
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
    (window as any).__mount({ birdLab: { view: 'recovery' } });
  }, width);
  await page.waitForSelector('[data-recovery-chart]');
}

// Where each count lives in the cards, and what it must read.
const WANT: Record<string, { then: number; now: number; card: RegExp }> = {
  'Bald Eagle|us': { then: 417, now: 70000, card: /417 known pairs[\s\S]*~70,000 pairs/ },
  'Bald Eagle|maine': { then: 21, now: 700, card: /21 nesting pairs in 1967 → 700\+/ },
  'Peregrine Falcon|maine': { then: 0, now: 38, card: /Maine: 0 pairs 1960s → about 38 known pairs/ },
  'Atlantic Puffin|maine': { then: 1, now: 1300, card: /single pair in Maine[\s\S]*More than 1,300 pairs/ },
  'Whooping Crane|world': { then: 21, now: 800, card: /21 wild birds[\s\S]*~800 today/ },
  'California Condor|world': { then: 27, now: 500, card: /27 birds left[\s\S]*~500 condors/ },
  'Wild Turkey|maine': { then: 41, now: 50000, card: /50,000\+ turkeys[\s\S]*41 wild turkeys/ },
};
const twoSig = (r: number) => { const p = Math.pow(10, Math.max(0, Math.floor(Math.log10(r)) - 1)); return (Math.round(r / p) * p).toLocaleString('en-US'); };

test('every recovery sits at its own counts on the x10 scale', async ({ page }) => {
  await mount(page);
  const got = await page.evaluate(() => {
    const svg = document.querySelector('[data-recovery-chart]') as SVGSVGElement;
    const cards = Object.fromEntries([...document.querySelectorAll('h2')].map((h) => [h.textContent!.replace(/^\S+\s/, '').trim(), h.parentElement!.textContent!]));
    return {
      x0: Number(svg.getAttribute('data-x0')), x1: Number(svg.getAttribute('data-x1')), dec: Number(svg.getAttribute('data-decades')), zero: Number(svg.getAttribute('data-zero')),
      rows: [...svg.querySelectorAll('[data-recovery-row]')].map((g) => ({
        id: g.getAttribute('data-recovery-row')!,
        thenX: Number(g.querySelector('[data-recovery-then]')!.getAttribute('cx')),
        nowX: Number(g.querySelector('[data-recovery-now]')!.getAttribute('cx')),
        ratio: g.querySelector('[data-recovery-ratio]')!.textContent,
        text: g.textContent,
      })),
      cards,
      caption: svg.closest('figure')!.querySelector('figcaption')!.textContent,
    };
  });
  const X = (n: number) => got.x0 + Math.log10(n) / got.dec * (got.x1 - got.x0);
  expect(got.rows.map((r) => r.id)).toEqual(Object.keys(WANT));
  for (const r of got.rows) {
    const w = WANT[r.id];
    // The counts come from the story itself.
    expect(got.cards[r.id.split('|')[0]], r.id).toMatch(w.card);
    expect(r.nowX, `${r.id} today`).toBeCloseTo(X(w.now), 1);
    if (w.then === 0) {
      expect(r.thenX, `${r.id} from zero`).toBe(got.zero);
      expect(got.zero).toBeLessThan(X(1));
      expect(r.ratio).toBe('from 0');
    } else {
      expect(r.thenX, `${r.id} then`).toBeCloseTo(X(w.then), 1);
      expect(r.ratio, r.id).toBe('×' + twoSig(w.now / w.then));
    }
  }
  const by = Object.fromEntries(got.rows.map((r) => [r.id, r]));
  // Same arrow length = same ratio: the puffin (x1,300) runs further than the Maine eagle (x33).
  const len = (id: string) => by[id].nowX - by[id].thenX;
  expect(len('Atlantic Puffin|maine') / len('Bald Eagle|maine')).toBeCloseTo(Math.log10(1300) / Math.log10(700 / 21), 2);
  expect(by['Atlantic Puffin|maine'].text).toContain('1 pair · 1901');
  expect(by['Atlantic Puffin|maine'].text).toContain('1,300+ pairs');
  expect(by['Wild Turkey|maine'].text).toContain('41 released · 1977');
  // Left off, and the caption says why.
  expect(got.rows.some((r) => /Pelican|Bluebird/.test(r.id))).toBe(false);
  expect(got.caption).toContain('Brown Pelican');
  expect(got.caption).toContain('Eastern Bluebird');
  expect(got.cards['Brown Pelican']).toContain('600,000+ across its whole range');
});

test('no sideways scroll on a 390px phone', async ({ page }) => {
  await mount(page, 390);
  const over = await page.evaluate(() => {
    const wrap = document.querySelector('#wrap') as HTMLElement;
    return wrap.scrollWidth - wrap.clientWidth;
  });
  expect(over, 'horizontal overflow in px').toBeLessThanOrEqual(1);
});
