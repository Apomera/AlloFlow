/**
 * Bird Lab — warbler, flycatcher + vireo plates on the topography songbird.
 *
 * Twenty-five birds whose marks are spread over the whole body. Their zone
 * data (cap spot, mask, necklace, spectacles, wing patch, tail flash ...) used
 * to be drawn on a 126 px ellipse-and-circle; it is now painted on the same
 * region-by-region songbird as the topography lab. These checks walk every
 * bird in both views and read the painted regions and marks.
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

type Plate = { key: string; parts: Record<string, string>; bill: string; eye: string; marks: Record<string, string> };

async function walk(page: Page, view: string) {
  await page.goto(`${(harness as any).base}/__harness`);
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.birdLab, null, { timeout: 30000 });
  await page.evaluate((v) => (window as any).__mount({ birdLab: { view: v } }), view);
  await page.waitForSelector('[data-zone-plate]');
  const chips = page.locator('div.flex.gap-2.flex-wrap.mb-3 > button');
  const n = await chips.count();
  const out: Record<string, Plate> = {};
  for (let i = 0; i < n; i++) {
    const name = (await chips.nth(i).innerText()).trim();
    await chips.nth(i).click();
    await expect(page.locator('h2', { hasText: name }).first()).toBeVisible();
    out[name] = await page.evaluate(() => {
      const svg = document.querySelector('[data-zone-plate]')!;
      const parts: Record<string, string> = {}, marks: Record<string, string> = {};
      svg.querySelectorAll('[data-plumage-part]').forEach((p) => { parts[p.getAttribute('data-plumage-part')!] = p.getAttribute('fill') ?? 'MISSING'; });
      svg.querySelectorAll('[data-plumage-mark]').forEach((p) => { marks[p.getAttribute('data-plumage-mark')!] = p.getAttribute('fill') !== 'none' && p.getAttribute('fill') ? p.getAttribute('fill')! : (p.getAttribute('stroke') ?? 'MISSING'); });
      return { key: svg.getAttribute('data-zone-plate')!, parts, marks, bill: svg.querySelector('[data-plumage-part="bill"]')!.getAttribute('d')!,
        eye: svg.querySelector('[data-plumage-eye]')!.getAttribute('fill')! };
    });
  }
  return out;
}

const rgb = (hex: string) => { const m = /^#([0-9a-f]{6})$/i.exec(hex); if (!m) throw new Error(`not a color: ${hex}`); const n = parseInt(m[1], 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const is = {
  black: (c: string) => Math.max(...rgb(c)) < 60,
  white: (c: string) => Math.min(...rgb(c)) > 225,
  yellow: (c: string) => { const [r, g, b] = rgb(c); return r > 200 && g > 160 && b < 110; },
  orange: (c: string) => { const [r, g, b] = rgb(c); return r > 200 && g > 90 && g < 170 && b < 90; },
  red: (c: string) => { const [r, g, b] = rgb(c); return r > 150 && g < 90 && b < 90; },
  chestnut: (c: string) => { const [r, g, b] = rgb(c); return r > 110 && r > g * 1.8 && g > b; },
  blue: (c: string) => { const [r, , b] = rgb(c); return b > r + 40; },
};

test('warblers: all fifteen painted, each with the mark it is named for', async ({ page }) => {
  const w = await walk(page, 'warblers');
  expect(Object.keys(w).length).toBe(15);
  const bad: string[] = [];
  for (const [name, p] of Object.entries(w)) {
    for (const [part, fill] of Object.entries(p.parts)) if (!/^#[0-9a-f]{6}$/i.test(fill)) bad.push(`${name}.${part}=${fill}`);
    if (Object.keys(p.parts).length < 20) bad.push(`${name}: only ${Object.keys(p.parts).length} regions`);
  }
  expect(bad).toEqual([]);
  const y = w['Yellow-rumped Warbler'];
  expect(is.yellow(y.marks.capSpot) && is.yellow(y.parts.rump) && is.black(y.parts.cheek)).toBe(true);
  const r = w['American Redstart'];
  expect(is.orange(r.marks.tailFlash) && is.orange(r.marks.wingPatch) && is.black(r.parts.throat)).toBe(true);
  expect(is.white(w['Black-throated Blue Warbler'].marks.wingPatch) && is.black(w['Black-throated Blue Warbler'].parts.throat) && is.blue(w['Black-throated Blue Warbler'].parts.back)).toBe(true);
  const mag = w['Magnolia Warbler'];
  expect(is.white(mag.parts['wing-coverts']) && is.white(mag.parts.eyebrow) && is.black(mag.parts.cheek) && !!mag.marks.streaks).toBe(true);
  expect(is.black(w['Canada Warbler'].marks.necklace)).toBe(true);
  expect(w['Northern Parula'].marks.breastBand && w['Northern Parula'].marks.backPatch).toBeTruthy();
  const cs = w['Chestnut-sided Warbler'];
  expect(is.chestnut(cs.parts.flank) && is.yellow(cs.parts.crown) && is.black(cs.parts.malar) && is.white(cs.parts.cheek)).toBe(true);
  const bb = w['Blackburnian Warbler'];
  expect(is.orange(bb.parts.throat) && is.black(bb.parts.cheek) && is.orange(bb.marks.capSpot)).toBe(true);
  expect(is.black(w['Black-throated Green Warbler'].parts.throat) && is.yellow(w['Black-throated Green Warbler'].parts.cheek)).toBe(true);
  expect(is.black(w['Common Yellowthroat'].parts.forehead) && is.yellow(w['Common Yellowthroat'].parts.throat)).toBe(true);
  expect(w['Ovenbird'].marks.crownSides && is.white(w['Ovenbird'].parts.eyering)).toBeTruthy();
  const bw = w['Black-and-white Warbler'];
  expect(bw.marks.flankStreaks && bw.marks.crownSides).toBeTruthy();
});

test('flycatchers + vireos: eye surround and bill shape sort the group', async ({ page }) => {
  const f = await walk(page, 'flyvireo');
  expect(Object.keys(f).length).toBe(10);
  const flycatchers = ['Eastern Phoebe', 'Eastern Wood-Pewee', 'Yellow-bellied Flycatcher', 'Least Flycatcher', 'Great Crested Flycatcher', 'Eastern Kingbird', 'Olive-sided Flycatcher'];
  const vireos = ['Red-eyed Vireo', 'Blue-headed Vireo', 'Yellow-throated Vireo'];
  // One flat bill for every flycatcher, one hooked bill for every vireo, and the two differ.
  expect(new Set(flycatchers.map((n) => f[n].bill)).size).toBe(1);
  expect(new Set(vireos.map((n) => f[n].bill)).size).toBe(1);
  expect(f['Eastern Phoebe'].bill).not.toBe(f['Red-eyed Vireo'].bill);
  // Spectacles: an eye ring joined to the bill by the lores, on both spectacled vireos.
  for (const n of ['Blue-headed Vireo', 'Yellow-throated Vireo']) expect(f[n].parts.eyering, n).toBe(f[n].parts.lores);
  expect(is.white(f['Least Flycatcher'].parts.eyering)).toBe(true);
  expect(f['Eastern Phoebe'].parts.eyering).toBe(f['Eastern Phoebe'].parts.cheek);
  const rev = f['Red-eyed Vireo'];
  expect(is.red(rev.eye)).toBe(true);
  expect(is.red(f['Blue-headed Vireo'].eye)).toBe(false);
  expect(is.white(rev.parts.eyebrow)).toBe(true);
  expect(is.white(f['Eastern Kingbird'].marks.tailTip)).toBe(true);
  expect(f['Olive-sided Flycatcher'].marks.vest).toBeTruthy();
  expect(is.yellow(f['Great Crested Flycatcher'].parts.belly)).toBe(true);
});

test('warbler bills are thin, and differ from both flycatcher and vireo bills', async ({ page }) => {
  const w = await walk(page, 'warblers');
  const f = await walk(page, 'flyvireo');
  const warblerBills = new Set(Object.values(w).map((p) => p.bill));
  expect(warblerBills.size).toBe(1);
  const [wb] = [...warblerBills];
  expect(wb).not.toBe(f['Eastern Phoebe'].bill);
  expect(wb).not.toBe(f['Red-eyed Vireo'].bill);
});
