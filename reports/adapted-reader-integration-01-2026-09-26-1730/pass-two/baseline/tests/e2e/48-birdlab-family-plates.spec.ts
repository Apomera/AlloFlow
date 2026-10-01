/**
 * Bird Lab — thrushes, finches, blackbirds + corvids, hummingbirds + swifts.
 *
 * These four family views showed no bird at all: a name, then prose. Each
 * species now has a painted adult (the male where the sexes differ) on the
 * shared PLUMAGE_ART bodies. These checks walk every species in the four views
 * and read the painted regions, marks and bill.
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

test.describe.configure({ timeout: 600_000 });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

type Fig = { shape: string; parts: Record<string, string>; marks: Record<string, string>; bill: string | null; eye: string | null; w: number; h: number };

async function walk(page: Page, view: string) {
  await page.goto(`${(harness as any).base}/__harness`);
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.birdLab, null, { timeout: 30000 });
  await page.evaluate((v) => (window as any).__mount({ birdLab: { view: v } }), view);
  await page.waitForSelector('button[aria-pressed="true"]');
  const chips = page.locator('button[aria-pressed]');
  const n = await chips.count();
  const out: Record<string, Fig | null> = {};
  for (let i = 0; i < n; i++) {
    const name = (await chips.nth(i).innerText()).trim();
    await chips.nth(i).click();
    await expect(chips.nth(i)).toHaveAttribute('aria-pressed', 'true');
    out[name] = await page.evaluate((nm) => {
      const plate = [...document.querySelectorAll('[data-family-plate]')].find((p) => p.getAttribute('data-family-plate') === nm);
      if (!plate) return null;
      const svg = plate.querySelector('svg')!, r = svg.getBoundingClientRect();
      const parts: Record<string, string> = {}, marks: Record<string, string> = {};
      svg.querySelectorAll('[data-plumage-part]').forEach((p) => { parts[p.getAttribute('data-plumage-part')!] = p.getAttribute('fill') ?? 'MISSING'; });
      svg.querySelectorAll('[data-plumage-mark]').forEach((p) => { marks[p.getAttribute('data-plumage-mark')!] = p.getAttribute('fill') !== 'none' && p.getAttribute('fill') ? p.getAttribute('fill')! : (p.getAttribute('stroke') ?? 'MISSING'); });
      return { shape: svg.getAttribute('data-plumage-shape')!, parts, marks, w: r.width, h: r.height,
        bill: svg.querySelector('[data-plumage-part="bill"]')?.getAttribute('d') ?? null, eye: svg.querySelector('[data-plumage-eye]')?.getAttribute('fill') ?? null };
    }, name);
  }
  return out;
}

const rgb = (hex: string) => { const m = /^#([0-9a-f]{6})$/i.exec(hex); if (!m) throw new Error(`not a color: ${hex}`); const n = parseInt(m[1], 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const is = {
  black: (c: string) => Math.max(...rgb(c)) < 60,
  white: (c: string) => Math.min(...rgb(c)) > 225,
  yellow: (c: string) => { const [r, g, b] = rgb(c); return r > 200 && g > 160 && b < 110; },
  red: (c: string) => { const [r, g, b] = rgb(c); return r > 150 && g < 100 && b < 110; },
  rufous: (c: string) => { const [r, g, b] = rgb(c); return r > 150 && r > g + 40 && g > b; },
  blue: (c: string) => { const [r, , b] = rgb(c); return b > r + 40; },
  gray: (c: string) => { const [r, g, b] = rgb(c); return Math.max(r, g, b) - Math.min(r, g, b) < 18 && r > 90 && r < 200; },
};
const redder = (a: string, b: string) => { const [r1, , b1] = rgb(a), [r2, , b2] = rgb(b); return r1 - b1 > r2 - b2 + 20; };

function everyPainted(fam: Record<string, Fig | null>, expectShape: (name: string) => string) {
  const bad: string[] = [];
  for (const [name, f] of Object.entries(fam)) {
    if (!f) { bad.push(`${name}: no plate`); continue; }
    if (f.shape !== expectShape(name)) bad.push(`${name}: ${f.shape} body`);
    for (const [part, fill] of Object.entries(f.parts)) if (!/^#[0-9a-f]{6}$/i.test(fill)) bad.push(`${name}.${part}=${fill}`);
    if (f.h < 80) bad.push(`${name}: ${Math.round(f.h)}px tall`);
  }
  return bad;
}

test('thrushes: every species painted, each with its mark', async ({ page }) => {
  const t = await walk(page, 'thrushes');
  expect(Object.keys(t).length).toBe(8);
  expect(everyPainted(t, () => 'songbird')).toEqual([]);
  const robin = t['American Robin']!;
  expect(is.rufous(robin.parts.breast) && is.yellow(robin.parts.bill) && is.white(robin.parts.eyering)).toBe(true);
  // Hermit: the tail is redder than the back; Wood Thrush: bold black spots.
  expect(redder(t['Hermit Thrush']!.parts.tail, t['Hermit Thrush']!.parts.back)).toBe(true);
  expect(is.black(t['Wood Thrush']!.marks.spots)).toBe(true);
  // Veery: no eye ring; Swainson's: buff spectacles (ring + lores).
  expect(t['Veery']!.parts.eyering).toBe(t['Veery']!.parts.cheek);
  const sw = t["Swainson's Thrush"]!;
  expect(sw.parts.eyering).toBe(sw.parts.lores);
  expect(sw.parts.eyering).not.toBe(sw.parts.crown);
  for (const n of ['Gray-cheeked Thrush', "Bicknell's Thrush"]) expect(is.gray(t[n]!.parts.cheek), n).toBe(true);
  expect(is.blue(t['Eastern Bluebird']!.parts.back) && is.rufous(t['Eastern Bluebird']!.parts.breast)).toBe(true);
});

test('finches: every species painted; crossbills cross, the red finches differ', async ({ page }) => {
  const f = await walk(page, 'finches');
  expect(Object.keys(f).length).toBe(9);
  expect(everyPainted(f, () => 'songbird')).toEqual([]);
  for (const n of ['Red Crossbill', 'White-winged Crossbill']) expect((f[n]!.bill!.match(/M/g) || []).length, n).toBe(2);
  expect((f['Purple Finch']!.bill!.match(/M/g) || []).length).toBe(1);
  expect(is.white(f['White-winged Crossbill']!.parts.wingbars)).toBe(true);
  expect(is.white(f['Red Crossbill']!.parts.wingbars)).toBe(false);
  // Purple Finch is red over the crown; House Finch has a brown crown and red brow.
  expect(is.red(f['Purple Finch']!.parts.crown) || redder(f['Purple Finch']!.parts.crown, '#8a6a52')).toBe(true);
  expect(redder(f['House Finch']!.parts.eyebrow, f['House Finch']!.parts.crown)).toBe(true);
  const rp = f['Common Redpoll']!;
  expect(is.red(rp.parts.forehead) && is.black(rp.parts.throat)).toBe(true);
  expect(is.yellow(f['Pine Siskin']!.marks.tailFlash) && !!f['Pine Siskin']!.marks.streaks).toBe(true);
  const eg = f['Evening Grosbeak']!;
  expect(is.yellow(eg.parts.forehead) && is.white(eg.parts.secondary) && is.black(eg.parts.primary)).toBe(true);
  expect(is.black(f['American Goldfinch']!.parts.crown)).toBe(true);
});

test('blackbirds + corvids: every species painted, each with its mark', async ({ page }) => {
  const b = await walk(page, 'blackbirds');
  expect(Object.keys(b).length).toBe(10);
  expect(everyPainted(b, () => 'songbird')).toEqual([]);
  expect(is.red(b['Red-winged Blackbird']!.parts['wing-coverts'])).toBe(true);
  expect(is.yellow(b['Common Grackle']!.eye!)).toBe(true);
  expect(is.yellow(b['European Starling']!.parts.bill)).toBe(true);
  expect(is.black(b['Brown-headed Cowbird']!.parts.breast) && !is.black(b['Brown-headed Cowbird']!.parts.crown)).toBe(true);
  const bob = b['Bobolink']!;
  expect(is.black(bob.parts.breast) && is.white(bob.parts.rump) && !is.black(bob.parts.nape)).toBe(true);
  // The raven's shaggy throat; the crow has none. Both carry the heavy corvid bill.
  expect(b['Common Raven']!.marks.hackles).toBeTruthy();
  expect(b['American Crow']!.marks.hackles).toBeUndefined();
  expect(b['American Crow']!.bill).toBe(b['Common Raven']!.bill);
  expect(b['American Crow']!.bill).not.toBe(b['Brown-headed Cowbird']!.bill);
  expect(is.black(b['Blue Jay']!.marks.necklace) && !!b['Blue Jay']!.marks.crest).toBe(true);
  // Canada Jay: white face, dark hood on the back of the head, no dark stripe through the eye.
  const cj = b['Canada Jay']!;
  expect(is.white(cj.parts.cheek) && !is.white(cj.parts.nape) && is.white(cj.parts.eyeline)).toBe(true);
});

test('hummingbirds + swifts: the right bodies, and the gorgets', async ({ page }) => {
  const hs = await walk(page, 'hummswift');
  expect(Object.keys(hs).length).toBe(3);
  expect(everyPainted(hs, (n) => (n === 'Chimney Swift' ? 'swift' : 'hummer'))).toEqual([]);
  expect(is.red(hs['Ruby-throated Hummingbird']!.parts.gorget)).toBe(true);
  expect(is.rufous(hs['Rufous Hummingbird']!.parts.back)).toBe(true);
});
