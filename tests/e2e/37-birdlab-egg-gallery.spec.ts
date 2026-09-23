/**
 * Bird Lab — Egg Gallery: eggs drawn to one scale, the same egg every render.
 *
 * The gallery promised "eggs to scale" but drew flat ellipses lying on their
 * sides, scattered its speckles with Math.random() inside render (every
 * re-render repainted every egg), and filled the five white eggs with the
 * theme's TEXT colour variable, so in a light theme they would draw near-black.
 * Several ground colours were wrong (a lavender Mallard, a lime Eider).
 *
 * These checks measure the rendered outlines: one px-per-mm for every egg and
 * the scale bar, markings on the shell and mostly at the blunt end, identical
 * markup across re-renders, the detail egg beside a quarter at the same
 * enlargement, and readable text inside the host's dark shell.
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

// The host shell (stem_lab_module.js): dark background, dark text CLASSES reset
// to inherit, dark ink restored only on its list of light backgrounds.
const DARK_TEXT = ['slate', 'gray', 'zinc', 'neutral', 'stone'].flatMap((c) => [700, 800, 900].map((n) => `.text-${c}-${n}`));
const LIGHT_BG = ['.bg-white', '.bg-slate-100', '.bg-gray-100', '.from-white',
  ...['slate', 'gray', 'zinc', 'neutral', 'stone', 'indigo', 'blue', 'sky', 'cyan', 'teal', 'emerald', 'green', 'lime', 'yellow',
    'amber', 'orange', 'red', 'rose', 'pink', 'fuchsia', 'purple', 'violet'].map((c) => `.bg-${c}-50`)];
const SHIM = DARK_TEXT.map((c) => `[data-stem-tool-shell] ${c}`).join(', ') + ' { color: inherit; }\n'
  + LIGHT_BG.map((c) => `[data-stem-tool-shell] ${c}`).join(', ') + ' { color: #1e293b; }';

async function mount(page: Page, opts: { width?: number; shell?: boolean; lightTheme?: boolean } = {}) {
  await page.setViewportSize({ width: opts.width || 1100, height: 900 });
  await page.goto(`${(harness as any).base}/__harness`);
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.birdLab, null, { timeout: 30000 });
  await page.evaluate(({ shim, shell, light, width }) => {
    const wrap = document.querySelector('#wrap') as HTMLElement;
    wrap.style.width = width + 'px';
    if (shell) {
      wrap.setAttribute('data-stem-tool-shell', 'true');
      wrap.style.background = '#0f172a';
      wrap.style.color = '#e2e8f0';
      const st = document.createElement('style'); st.textContent = shim; document.head.appendChild(st);
    }
    // A light theme sets the stem text variable dark; the white eggs once used it as their fill.
    if (light) wrap.style.setProperty('--allo-stem-text', '#0f172a');
    (window as any).__mount({ birdLab: { view: 'eggGallery' } });
  }, { shim: SHIM, shell: !!opts.shell, light: !!opts.lightTheme, width: opts.width || 1100 });
  await page.waitForSelector('[data-egg-card] svg[data-egg]', { timeout: 30000 });
}

// Outline height on screen per millimetre of egg length, for every card.
const gridScale = (page: Page) => page.evaluate(() => [...document.querySelectorAll('[data-egg-card] svg[data-egg]')].map((svg) => {
  const outline = svg.querySelector('[data-egg-outline]') as SVGPathElement;
  return { egg: svg.getAttribute('data-egg'), pxPerMm: outline.getBoundingClientRect().height / Number(svg.getAttribute('data-egg-length')) };
}));

test('every egg, and the scale bar, share one px-per-mm', async ({ page }) => {
  await mount(page);
  const rows = await gridScale(page);
  expect(rows.length, 'egg cards').toBeGreaterThanOrEqual(35);
  const ref = rows[0].pxPerMm;
  for (const r of rows) expect(Math.abs(r.pxPerMm - ref) / ref, `${r.egg} is drawn at ${r.pxPerMm.toFixed(3)} px/mm, not ${ref.toFixed(3)}`).toBeLessThan(0.04);
  const bar = await page.evaluate(() => {
    const el = document.querySelector('[data-egg-scalebar]') as HTMLElement;
    const path = el.querySelector('path') as SVGPathElement;
    return { mm: Number(el.getAttribute('data-egg-scalebar')), px: path.getBoundingClientRect().width };
  });
  expect(Math.abs(bar.px / bar.mm - ref) / ref, `scale bar is ${(bar.px / bar.mm).toFixed(3)} px/mm`).toBeLessThan(0.06);
  // Eggs stand upright: longer than they are wide on screen.
  const upright = await page.evaluate(() => [...document.querySelectorAll('[data-egg-card] [data-egg-outline]')]
    .filter((o) => { const b = o.getBoundingClientRect(); return b.height <= b.width; }).length);
  expect(upright, 'eggs drawn lying down').toBe(0);
});

test('the same egg on every render', async ({ page }) => {
  await mount(page);
  const snap = () => page.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-egg-card] svg[data-egg]')]
    .map((s) => [s.getAttribute('data-egg'), s.innerHTML])));
  const first = await snap();
  // Re-sort twice: every card re-renders.
  await page.getByRole('button', { name: 'Sort alphabetically' }).click();
  await page.getByRole('button', { name: 'Sort by size' }).click();
  const second = await snap();
  expect(Object.keys(second).length).toBe(Object.keys(first).length);
  for (const k of Object.keys(first)) expect(second[k], `${k} repainted differently`).toBe(first[k]);
});

test('markings sit on the shell, mostly toward the blunt end', async ({ page }) => {
  await mount(page);
  const res = await page.evaluate(() => {
    const out = { marks: 0, outside: [] as string[], blunt: 0, markedEggs: 0 };
    for (const svg of document.querySelectorAll('[data-egg-card] svg[data-egg]')) {
      const outline = svg.querySelector('[data-egg-outline]') as SVGPathElement;
      const marks = [...svg.querySelectorAll('ellipse[data-egg-mark]')] as SVGEllipseElement[];
      if (marks.length) out.markedEggs++;
      const toOutline = (outline.getScreenCTM() as DOMMatrix).inverse();
      const box = outline.getBoundingClientRect();
      for (const m of marks) {
        // Through the screen, so a transform on any wrapper is measured too.
        const c = new DOMPoint(Number(m.getAttribute('cx')), Number(m.getAttribute('cy'))).matrixTransform(m.getScreenCTM() as DOMMatrix);
        const p = c.matrixTransform(toOutline);
        const pt = (svg as SVGSVGElement).createSVGPoint(); pt.x = p.x; pt.y = p.y;
        out.marks++;
        if (!outline.isPointInFill(pt)) out.outside.push(svg.getAttribute('data-egg') as string);
        if (c.y > box.top + box.height / 2) out.blunt++;
      }
    }
    return out;
  });
  expect(res.markedEggs, 'eggs with markings').toBeGreaterThanOrEqual(15);
  expect(res.outside, 'marks off the shell').toEqual([]);
  expect(res.blunt / res.marks, 'share of marks on the blunt half').toBeGreaterThan(0.6);
});

test('white eggs stay white in a light theme', async ({ page }) => {
  await mount(page, { lightTheme: true });
  const fills = await page.evaluate(() => [...document.querySelectorAll('[data-egg-card] [data-egg-outline]')].map((o) => ({
    egg: (o.closest('svg') as SVGSVGElement).getAttribute('data-egg'),
    attr: o.getAttribute('fill') || '',
    rgb: getComputedStyle(o).fill,
  })));
  for (const f of fills) expect(f.attr, `${f.egg} fill uses a theme variable`).not.toMatch(/var\(/);
  const lum = (rgb: string) => { const [r, g, b] = (rgb.match(/\d+/g) || []).map(Number); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; };
  for (const id of ['beltedkingfisher', 'pileatedwoodpecker', 'treeswallow', 'rubythroatedhummingbird']) {
    const f = fills.find((x) => x.egg === id);
    expect(f, id).toBeTruthy();
    expect(lum(f!.rgb), `${id} egg is not white`).toBeGreaterThan(0.9);
  }
  // Eggs whose real ground colour is not blue must not be drawn blue or lavender.
  for (const id of ['mallard', 'commoneider', 'northerncardinal']) {
    const [r, , b] = ((fills.find((x) => x.egg === id)!.rgb.match(/\d+/g)) || []).map(Number);
    expect(b, `${id} is drawn blue`).toBeLessThanOrEqual(r);
  }
});

test('the detail egg stands beside a quarter at the same scale', async ({ page }) => {
  await mount(page);
  await page.locator('[data-egg-card="americanrobin"]').click();
  const detail = page.locator('[data-egg-detail="americanrobin"]');
  await expect(detail).toBeVisible();
  await expect(detail.getByRole('img', { name: /American Robin/ })).toHaveCount(1);
  await expect(page.locator('[data-egg-card="americanrobin"]')).toHaveAttribute('aria-pressed', 'true');
  const ratio = await detail.evaluate((el) => {
    const egg = el.querySelector('[data-egg-outline]') as SVGPathElement;
    const coin = el.querySelector('[data-coin-disc]') as SVGCircleElement;
    return egg.getBoundingClientRect().height / coin.getBoundingClientRect().height;
  });
  // Robin egg 28 mm long; a quarter is 24.26 mm across.
  expect(Math.abs(ratio - 28 / 24.26), `egg:quarter is ${ratio.toFixed(3)}`).toBeLessThan(0.04);
});

test('text stays readable inside the host shell, with an egg picked', async ({ page }) => {
  await mount(page, { shell: true });
  await page.locator('[data-egg-card="commonloon"]').click();
  await expect(page.locator('[data-egg-detail="commonloon"]')).toBeVisible();
  const bad = await page.evaluate(async () => {
    const r = await (window as any).axe.run(document.querySelector('#wrap'), { runOnly: { type: 'rule', values: ['color-contrast'] } });
    return (r.violations[0]?.nodes || []).map((n: any) => `${n.target[0]} ${n.any[0]?.data?.fgColor} on ${n.any[0]?.data?.bgColor}`);
  });
  expect(bad).toEqual([]);
});

test('no sideways scroll on a 390px phone', async ({ page }) => {
  await mount(page, { width: 390 });
  await page.locator('[data-egg-card="commonloon"]').click();
  const over = await page.evaluate(() => {
    const wrap = document.querySelector('#wrap') as HTMLElement;
    return wrap.scrollWidth - wrap.clientWidth;
  });
  expect(over, 'horizontal overflow in px').toBeLessThanOrEqual(1);
});
