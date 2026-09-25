/**
 * Bird Lab — Tracks + Sign and Foot Types: the prints and feet are drawn.
 *
 * Tracks + Sign described every footprint in prose ("3 forward + 1 rear",
 * "webbed", "X pattern") and drew none. Foot Types sent students to another
 * activity for its pictures. Prints are now drawn from toe layouts at one
 * scale beside a quarter, with a gait trail; Foot Types shows the Beak & Feet
 * drawings inline.
 *
 * Measured on screen: print sizes rank the way the text's sizes do, and a
 * plover print is about a quarter across while a turkey's is several; webs
 * appear exactly where the text says the foot is webbed; a runner leaves a
 * single line while a walker's prints alternate.
 */
import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolId: 'birdLab',
  toolFile: 'stem_lab/stem_tool_birdlab.js',
  preScripts: ['stem_lab/stem_lab_module.js'],
  extraScripts: ['node_modules/axe-core/axe.min.js'],
  width: 1100,
  height: 900,
  appStyles: true,
  layout: 'document',
});

test.describe.configure({ timeout: 300_000 });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

const DARK_TEXT = ['slate', 'gray', 'zinc', 'neutral', 'stone'].flatMap((c) => [700, 800, 900].map((n) => `.text-${c}-${n}`));
const LIGHT_BG = ['.bg-white', '.bg-slate-100', '.bg-gray-100', '.from-white',
  ...['slate', 'gray', 'zinc', 'neutral', 'stone', 'indigo', 'blue', 'sky', 'cyan', 'teal', 'emerald', 'green', 'lime', 'yellow',
    'amber', 'orange', 'red', 'rose', 'pink', 'fuchsia', 'purple', 'violet'].map((c) => `.bg-${c}-50`)];
const SHIM = DARK_TEXT.map((c) => `[data-stem-tool-shell] ${c}`).join(', ') + ' { color: inherit; }\n'
  + LIGHT_BG.map((c) => `[data-stem-tool-shell] ${c}`).join(', ') + ' { color: #1e293b; }';

async function mount(page: Page, view: string, shell = false) {
  await page.goto(`${(harness as any).base}/__harness`);
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.birdLab, null, { timeout: 30000 });
  await page.evaluate(({ v, shim, shell }) => {
    if (shell) {
      const wrap = document.querySelector('#wrap') as HTMLElement;
      wrap.setAttribute('data-stem-tool-shell', 'true'); wrap.style.background = '#0f172a'; wrap.style.color = '#e2e8f0';
      const st = document.createElement('style'); st.textContent = shim; document.head.appendChild(st);
    }
    (window as any).__mount({ birdLab: { view: v } });
  }, { v: view, shim: SHIM, shell });
}

const pick = async (page: Page, name: string) => {
  await page.getByRole('button', { name, exact: true }).click();
  await page.waitForSelector('[data-track-figure]');
};

// Height on screen of the drawn print (toes + claws), and of the quarter beside it.
const printSize = (page: Page) => page.evaluate(() => {
  const fig = document.querySelector('[data-track-figure]') as HTMLElement;
  const svg = fig.querySelector('svg[data-track]') as SVGSVGElement | null;
  if (!svg) return null;
  const parts = [...svg.querySelectorAll('[data-track-toe], [data-track-claw]')].map((e) => e.getBoundingClientRect());
  const top = Math.min(...parts.map((r) => r.top)), bottom = Math.max(...parts.map((r) => r.bottom));
  const coin = (fig.querySelector('[data-coin-disc]') as SVGCircleElement).getBoundingClientRect();
  return { print: bottom - top, coin: coin.height, webs: svg.querySelectorAll('[data-track-web]').length };
});

test('prints are to scale with each other and with a quarter', async ({ page }) => {
  await mount(page, 'tracksSign');
  await page.waitForSelector('[data-track-figure]');
  const size: Record<string, { print: number; coin: number; webs: number }> = {};
  for (const [name, id] of [['Wild Turkey', 'turkey'], ['Ruffed Grouse', 'grouse'], ['Piping Plover', 'plover'], ['American Crow', 'crow'], ['Bald Eagle', 'eagle']]) {
    await pick(page, name);
    size[id] = (await printSize(page))!;
  }
  // Text: turkey 4-5 in > eagle ~4 in > crow ~3 in > grouse ~2 in > plover ~1 in.
  expect(size.turkey.print).toBeGreaterThan(size.eagle.print);
  expect(size.eagle.print).toBeGreaterThan(size.crow.print);
  expect(size.crow.print).toBeGreaterThan(size.grouse.print);
  expect(size.grouse.print).toBeGreaterThan(size.plover.print);
  // A quarter is 24 mm: a plover print is about that, a turkey's several times it.
  expect(size.plover.print / size.plover.coin).toBeGreaterThan(0.6);
  expect(size.plover.print / size.plover.coin).toBeLessThan(1.4);
  expect(size.turkey.print / size.turkey.coin).toBeGreaterThan(3.5);
});

test('webbing is drawn where, and only where, the foot is webbed', async ({ page }) => {
  await mount(page, 'tracksSign');
  await page.waitForSelector('[data-track-figure]');
  for (const [name, webbed] of [['Herring Gull', true], ['Mallard', true], ['American Crow', false], ['Wild Turkey', false], ['Piping Plover', false]] as const) {
    await pick(page, name);
    const s = (await printSize(page))!;
    expect(s.webs > 0, `${name} webbing`).toBe(webbed);
  }
});

test('a runner leaves a single line, a walker alternates; non-walkers get a note', async ({ page }) => {
  await mount(page, 'tracksSign');
  await page.waitForSelector('[data-track-figure]');
  const spread = async (name: string) => {
    await pick(page, name);
    return page.evaluate(() => {
      const ys = [...document.querySelectorAll('[data-trail-print]')].map((g) => { const r = g.getBoundingClientRect(); return r.top + r.height / 2; });
      return Math.max(...ys) - Math.min(...ys);
    });
  };
  const plover = await spread('Piping Plover');
  const turkey = await spread('Wild Turkey');
  expect(turkey).toBeGreaterThan(plover * 2);
  await pick(page, 'Belted Kingfisher');
  await expect(page.locator('[data-track-figure] svg')).toHaveCount(0);
  await expect(page.locator('[data-track-figure]')).toContainText('rarely walks');
});

test('foot types show a drawing on every card', async ({ page }) => {
  await mount(page, 'footTypes');
  await page.waitForSelector('[data-foot-card]');
  const cards = await page.locator('[data-foot-card]').evaluateAll((els) => els.map((e) => ({ id: e.getAttribute('data-foot-card'), art: !!e.querySelector('svg[data-foot-art] *') })));
  expect(cards.length).toBeGreaterThanOrEqual(8);
  for (const c of cards) expect(c.art, `${c.id} has no drawing`).toBe(true);
  await expect(page.getByText('Lobed swimmer (lobate)')).toBeVisible();
});

test('tracks view is readable in the host shell', async ({ page }) => {
  await mount(page, 'tracksSign', true);
  await page.waitForSelector('[data-track-figure]');
  const bad = await page.evaluate(async () => {
    const r = await (window as any).axe.run(document.querySelector('#wrap'), { runOnly: { type: 'rule', values: ['color-contrast'] } });
    return (r.violations[0]?.nodes || []).map((n: any) => `${n.target[0]} ${n.any[0]?.data?.fgColor} on ${n.any[0]?.data?.bgColor}`);
  });
  expect(bad).toEqual([]);
});
