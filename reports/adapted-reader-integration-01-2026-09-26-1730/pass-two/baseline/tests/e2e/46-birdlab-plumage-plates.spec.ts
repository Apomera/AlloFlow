/**
 * Bird Lab — plumage plates: each figure on the body of its kind, painted by
 * region, so the field mark a caption names is the one on screen.
 *
 * Seasonal Plumage, Aging + Sexing and Birds by Color drew every bird, loons,
 * eagles, gulls and ducks included, as the same small perching blob with a
 * body, wing and head color and one "patch" dot that meant a cap on one bird
 * and a wing patch on the next. Now songbirds are the topography songbird
 * painted region by region, and loons, ducks, raptors, owls, hummingbirds,
 * gulls and woodpeckers have their own bodies. These checks read the rendered
 * regions, and state each mark from the field guides, not from the data table.
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

async function mount(page: Page, view: string) {
  await page.goto(`${(harness as any).base}/__harness`);
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.birdLab, null, { timeout: 30000 });
  await page.evaluate((v) => (window as any).__mount({ birdLab: { view: v } }), view);
  await page.waitForSelector('[data-plumage-figure]');
}

type Fig = { name: string; shape: string; parts: Record<string, string>; marks: Record<string, string>; height: number; plate: number };
const figures = (page: Page) => page.evaluate(() => {
  const plates = [...document.querySelectorAll('[data-plumage-plate]')];
  return [...document.querySelectorAll('[data-plumage-figure]')].map((f) => {
    const svg = f.querySelector('svg')!;
    const parts: Record<string, string> = {}, marks: Record<string, string> = {};
    svg.querySelectorAll('[data-plumage-part]').forEach((p) => { parts[p.getAttribute('data-plumage-part')!] = p.getAttribute('fill') ?? 'MISSING'; });
    svg.querySelectorAll('[data-plumage-mark]').forEach((p) => { marks[p.getAttribute('data-plumage-mark')!] = p.getAttribute('fill') !== 'none' && p.getAttribute('fill') ? p.getAttribute('fill')! : (p.getAttribute('stroke') ?? 'MISSING'); });
    return { name: f.getAttribute('data-plumage-figure')!, shape: svg.getAttribute('data-plumage-shape')!, parts, marks,
      height: svg.getBoundingClientRect().height, plate: plates.indexOf(f.closest('[data-plumage-plate]')!) };
  });
});

const rgb = (hex: string) => { const m = /^#([0-9a-f]{6})$/i.exec(hex); if (!m) throw new Error(`not a color: ${hex}`); const n = parseInt(m[1], 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const is = {
  black: (c: string) => Math.max(...rgb(c)) < 60,
  white: (c: string) => Math.min(...rgb(c)) > 225,
  yellow: (c: string) => { const [r, g, b] = rgb(c); return r > 200 && g > 160 && b < 110; },
  orange: (c: string) => { const [r, g, b] = rgb(c); return r > 200 && g > 90 && g < 170 && b < 90; },
  red: (c: string) => { const [r, g, b] = rgb(c); return r > 150 && g < 90 && b < 90; },
  blueGray: (c: string) => { const [r, , b] = rgb(c); return b > r + 20; },
  rufous: (c: string) => { const [r, g, b] = rgb(c); return r > 150 && r > g + 40 && g > b; },
};
function check(figs: Fig[], name: string, fn: (f: Fig) => void) {
  const f = figs.find((x) => x.name === name);
  expect(f, `figure "${name}"`).toBeTruthy();
  fn(f!);
}

async function allPlumageFigures(page: Page) {
  await mount(page, 'plumage');
  const chips = page.locator('button[aria-pressed]').filter({ hasNotText: /Menu/ });
  const n = await chips.count();
  expect(n).toBe(14);
  const out: Record<string, Fig[]> = {};
  for (let i = 0; i < n; i++) {
    const species = (await chips.nth(i).innerText()).trim();
    await chips.nth(i).click();
    await expect(chips.nth(i)).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('heading', { level: 2, name: species })).toBeVisible();
    out[species] = await figures(page);
  }
  return out;
}

const SHAPE: Record<string, string> = {
  'Common Loon': 'loon', 'Common Eider': 'eider', 'Wood Duck': 'duck', 'Bald Eagle': 'raptor', 'Snowy Owl': 'owl', 'Ruby-throated Hummingbird': 'hummer',
};

test('every figure is drawn on the body of its kind, with every region colored', async ({ page }) => {
  const plumage = await allPlumageFigures(page);
  for (const [species, figs] of Object.entries(plumage)) {
    expect(figs.length, species).toBeGreaterThan(0);
    for (const f of figs) expect(f.shape, `${species}: ${f.name}`).toBe(SHAPE[species] || 'songbird');
  }
  await mount(page, 'agesex');
  const ageSex = await figures(page);
  await mount(page, 'colorId');
  const color = await figures(page);
  const shapeOf = (figs: Fig[]) => Object.fromEntries(figs.map((f) => [f.name, f.shape]));
  const a = shapeOf(ageSex), c = shapeOf(color);
  for (const n of ['Juvenile eagle', 'Adult (4-5 yr)', 'Kestrel male', 'Kestrel female']) expect(a[n], n).toBe('raptor');
  for (const n of ['1st winter', '2nd winter', '3rd winter', '4th winter']) expect(a[n], n).toBe('gull');
  for (const n of ['Wood Duck male', 'Wood Duck female']) expect(a[n], n).toBe('duck');
  for (const n of ['First-fall', 'Adult', 'Cardinal male', 'Cardinal female']) expect(a[n], n).toBe('songbird');
  expect(c['Common Loon']).toBe('loon');
  expect(c['Downy Woodpecker']).toBe('woodpecker');
  expect(c['Mallard']).toBe('duck');
  for (const n of ['Cardinal', 'Goldfinch', 'Blue Jay', 'Chickadee', 'Junco', 'Gray Catbird', 'Grackle']) expect(c[n], n).toBe('songbird');
  // Within an age or sex comparison the body is fixed, so only plumage differs.
  const byPlate: Record<number, Set<string>> = {};
  ageSex.forEach((f) => (byPlate[f.plate] = byPlate[f.plate] || new Set()).add(f.shape));
  for (const [p, s] of Object.entries(byPlate)) expect(s.size, `age/sex plate ${p}`).toBe(1);
  // No region is left without a color: an unset fill paints black.
  const everyFig = [...Object.values(plumage).flat(), ...ageSex, ...color];
  expect(everyFig.length).toBe(55);
  const bad: string[] = [];
  for (const f of everyFig) {
    for (const [part, fill] of Object.entries(f.parts)) if (!/^#[0-9a-f]{6}$/i.test(fill)) bad.push(`${f.name}.${part}=${fill}`);
    if (f.height < 60) bad.push(`${f.name} drawn ${Math.round(f.height)}px tall`);
  }
  expect(bad).toEqual([]);
});

test('seasonal plumage: the change each caption names is on the bird', async ({ page }) => {
  const p = await allPlumageFigures(page);
  const [goldB, goldN] = p['American Goldfinch'];
  expect(is.black(goldB.parts.crown) && is.yellow(goldB.parts.throat) && is.orange(goldB.parts.bill)).toBe(true);
  expect(is.black(goldN.parts.crown) || is.yellow(goldN.parts.breast) || is.orange(goldN.parts.bill)).toBe(false);
  const [loonB, loonN] = p['Common Loon'];
  expect(loonB.marks.necklace && loonB.marks.checks).toBeTruthy();
  expect(is.black(loonB.parts.crown) && is.white(loonB.parts.breast)).toBe(true);
  expect(loonN.marks.necklace).toBeUndefined();
  expect(is.white(loonN.parts.foreneck) && !is.black(loonN.parts.back)).toBe(true);
  const [buntB, buntN] = p['Snow Bunting'];
  expect(is.black(buntB.parts.back) && is.white(buntB.parts.crown) && is.white(buntB.parts.secondary)).toBe(true);
  expect(is.black(buntN.parts.back) || is.white(buntN.parts.crown)).toBe(false);
  expect(is.white(buntN.parts.secondary)).toBe(true);
  const [wodu, eclipse] = p['Wood Duck'];
  expect(wodu.marks.faceLines && wodu.marks.crest).toBeTruthy();
  expect(eclipse.marks.faceLines).toBeUndefined();
  expect(is.red(eclipse.parts.bill)).toBe(true);
  const [owlM, owlF] = p['Snowy Owl'];
  expect(owlF.marks.bars).toBeTruthy();
  expect(owlM.marks.bars).toBeUndefined();
  const [wts, tan] = p['White-throated Sparrow'];
  expect(is.white(wts.marks.crownStripe) && is.yellow(wts.parts.lores)).toBe(true);
  expect(is.white(tan.marks.crownStripe)).toBe(false);
  check(p['Black-capped Chickadee'], 'All year', (f) => expect(is.black(f.parts.throat) && is.white(f.parts.cheek) && is.black(f.parts.crown)).toBe(true));
  check(p['Red-winged Blackbird'], 'Male, all year', (f) => expect(is.red(f.parts['wing-coverts']) && is.black(f.parts.breast)).toBe(true));
  check(p['Cedar Waxwing'], 'All year', (f) => { expect(f.marks.waxTips && f.marks.crest).toBeTruthy(); expect(is.yellow(f.marks.tailTip) && is.black(f.parts.lores)).toBe(true); });
  check(p['Bald Eagle'], 'Adult, all year', (f) => expect(is.white(f.parts.head) && is.white(f.parts.tail) && is.yellow(f.parts.bill)).toBe(true));
  check(p['Ruby-throated Hummingbird'], 'Male, all year', (f) => expect(is.red(f.parts.gorget)).toBe(true));
  check(p['Northern Cardinal'], 'Male, all year', (f) => { expect(f.marks.crest).toBeTruthy(); expect(is.red(f.parts.breast) && is.black(f.parts.lores)).toBe(true); });
});

test('aging + sexing: the difference named is the difference drawn', async ({ page }) => {
  await mount(page, 'agesex');
  const a = await figures(page);
  check(a, 'Juvenile eagle', (f) => { expect(is.white(f.parts.head)).toBe(false); expect(f.marks.mottle).toBeTruthy(); });
  check(a, 'Adult (4-5 yr)', (f) => expect(is.white(f.parts.head) && is.white(f.parts.tail)).toBe(true));
  check(a, '1st winter', (f) => expect(is.black(f.parts.bill) && !!f.marks.mottle).toBe(true));
  check(a, '4th winter', (f) => { expect(is.yellow(f.parts.bill) && is.red(f.marks.gonys) && is.blueGray(f.parts.mantle)).toBe(true); expect(f.marks.mottle).toBeUndefined(); });
  // Bill marks sit outside the body outline; clipped to it they vanish.
  const onScreen = await page.evaluate(() => ['gonys', 'billTip'].map((m) => {
    const fig = [...document.querySelectorAll('[data-plumage-figure]')].find((f) => f.getAttribute('data-plumage-figure') === (m === 'gonys' ? '4th winter' : '3rd winter'))!;
    const el = fig.querySelector(`[data-plumage-mark="${m}"]`)!;
    el.scrollIntoView({ block: 'center' });
    const r = el.getBoundingClientRect();
    return document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) === el;
  }));
  expect(onScreen, 'gonys spot + dark bill tip are painted').toEqual([true, true]);
  check(a, 'Kestrel male', (f) => expect(is.blueGray(f.parts.wing) && is.rufous(f.parts.tail) && !!f.marks.spots).toBe(true));
  check(a, 'Kestrel female', (f) => expect(is.rufous(f.parts.wing) && !!f.marks.wingBars && !!f.marks.streaks).toBe(true));
  check(a, 'Adult', (f) => expect(is.black(f.parts.crown) && is.white(f.marks.crownStripe)).toBe(true));
  check(a, 'First-fall', (f) => expect(is.black(f.parts.crown) || is.white(f.marks.crownStripe)).toBe(false));
  check(a, 'Wood Duck female', (f) => expect(is.white(f.marks.eyePatch)).toBe(true));
  check(a, 'Cardinal female', (f) => expect(is.red(f.parts.breast)).toBe(false));
});

test('birds by color: each bird carries its named mark', async ({ page }) => {
  await mount(page, 'colorId');
  const c = await figures(page);
  check(c, 'Downy Woodpecker', (f) => expect(is.red(f.marks.redNape) && is.white(f.parts.under)).toBe(true));
  check(c, 'Blue Jay', (f) => expect(is.black(f.marks.necklace) && !!f.marks.crest).toBe(true));
  check(c, 'Yellow Warbler', (f) => expect(is.yellow(f.parts.breast) && !!f.marks.streaks).toBe(true));
  check(c, 'Yellowthroat', (f) => expect(is.black(f.parts.cheek) && is.yellow(f.parts.throat)).toBe(true));
  check(c, 'Gray Catbird', (f) => expect(is.black(f.parts.crown) && is.rufous(f.parts.undertail)).toBe(true));
  check(c, 'Mallard', (f) => expect(is.white(f.marks.neckRing) && is.yellow(f.parts.bill)).toBe(true));
  check(c, 'Common Loon', (f) => expect(f.marks.checks).toBeTruthy());
  check(c, 'Scarlet Tanager', (f) => expect(is.red(f.parts.breast) && is.black(f.parts['wing-coverts'])).toBe(true));
  check(c, 'Spotted breast', (f) => { expect(f.marks.spots).toBeTruthy(); expect(f.marks.streaks).toBeUndefined(); });
  check(c, 'Streaked breast', (f) => { expect(f.marks.streaks).toBeTruthy(); expect(f.marks.spots).toBeUndefined(); });
  check(c, 'Plain brown', (f) => { expect(f.marks.streaks).toBeUndefined(); expect(f.marks.spots).toBeUndefined(); });
});
