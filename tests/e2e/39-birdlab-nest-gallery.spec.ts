/**
 * Bird Lab — Nest Gallery: every nest drawn to its stated size, eggs to scale.
 *
 * The gallery drew platform, cup, mound and scrape nests as the same brown
 * oval, set the eggs in a ring around the centre so they sat on the rim or in
 * the sky, and labelled every picture "Bird body-shape sketch". Now each nest
 * type is its own scene (stick platform, woven cup, hanging pouch, cavity,
 * burrow, scrape...) drawn at a px-per-mm taken from the nest's stated size,
 * with the eggs from the Egg Gallery at that same scale.
 *
 * Measured, not recomputed: each egg's long axis is mapped through the screen
 * transform chain into the nest drawing's units (the squash of a view from
 * above undone), then compared with the egg's real length at the scene's
 * declared scale. The nest body's drawn width is held to its stated size too.
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

test.describe.configure({ timeout: 600_000 });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

const DARK_TEXT = ['slate', 'gray', 'zinc', 'neutral', 'stone'].flatMap((c) => [700, 800, 900].map((n) => `.text-${c}-${n}`));
const LIGHT_BG = ['.bg-white', '.bg-slate-100', '.bg-gray-100', '.from-white',
  ...['slate', 'gray', 'zinc', 'neutral', 'stone', 'indigo', 'blue', 'sky', 'cyan', 'teal', 'emerald', 'green', 'lime', 'yellow',
    'amber', 'orange', 'red', 'rose', 'pink', 'fuchsia', 'purple', 'violet'].map((c) => `.bg-${c}-50`)];
const SHIM = DARK_TEXT.map((c) => `[data-stem-tool-shell] ${c}`).join(', ') + ' { color: inherit; }\n'
  + LIGHT_BG.map((c) => `[data-stem-tool-shell] ${c}`).join(', ') + ' { color: #1e293b; }';

async function mount(page: Page, shell = false) {
  await page.goto(`${(harness as any).base}/__harness`);
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.birdLab, null, { timeout: 30000 });
  await page.evaluate(({ shim, shell }) => {
    if (shell) {
      const wrap = document.querySelector('#wrap') as HTMLElement;
      wrap.setAttribute('data-stem-tool-shell', 'true');
      wrap.style.background = '#0f172a';
      wrap.style.color = '#e2e8f0';
      const st = document.createElement('style'); st.textContent = shim; document.head.appendChild(st);
    }
    (window as any).__mount({ birdLab: { view: 'nestGallery' } });
  }, { shim: SHIM, shell });
  await page.waitForSelector('svg[data-nest]', { timeout: 30000 });
}

// Everything about the drawn nest, in the nest drawing's own units.
const measure = (page: Page) => page.evaluate(() => {
  const svg = document.querySelector('svg[data-nest]') as SVGSVGElement;
  const toNest = (svg.getScreenCTM() as DOMMatrix).inverse();
  const pxPerMm = Number(svg.getAttribute('data-px-per-mm'));
  const inNest = (el: SVGGraphicsElement, x: number, y: number) =>
    new DOMPoint(x, y).matrixTransform(el.getScreenCTM() as DOMMatrix).matrixTransform(toNest);
  const boxInNest = (el: SVGGraphicsElement) => {
    const r = el.getBoundingClientRect();
    const a = new DOMPoint(r.left, r.top).matrixTransform(toNest), b = new DOMPoint(r.right, r.bottom).matrixTransform(toNest);
    return { x0: a.x, y0: a.y, x1: b.x, y1: b.y };
  };
  const bowl = boxInNest(svg.querySelector('[data-nest-bowl]') as SVGGraphicsElement);
  const body = boxInNest(svg.querySelector('[data-nest-body]') as SVGGraphicsElement);
  const eggs = [...svg.querySelectorAll('[data-nest-egg]')].map((g) => {
    const inner = g.querySelector('svg[data-egg]') as SVGSVGElement;
    const outline = inner.querySelector('[data-egg-outline]') as SVGPathElement;
    const Lmm = Number(inner.getAttribute('data-egg-length'));
    // The egg's own axis runs from (0,-L/2) to (0,L/2) in its mm viewBox.
    const p = inNest(outline, 0, -Lmm / 2), q = inNest(outline, 0, Lmm / 2), c = inNest(outline, 0, 0);
    const squash = Number((/scale\(1 ([\d.]+)\)/.exec(g.getAttribute('transform') || '') || [0, 1])[1]);
    const len = Math.hypot(q.x - p.x, (q.y - p.y) / squash);
    return { Lmm, len, cx: c.x, cy: c.y };
  });
  return { id: svg.getAttribute('data-nest'), kind: svg.getAttribute('data-nest-kind'), label: svg.getAttribute('aria-label'), pxPerMm,
    nestMm: Number(svg.getAttribute('data-nest-mm')), bowl, body, eggs };
});

test('every nest: eggs to the nest\'s scale, lying in the nest, nest at its stated size', async ({ page }) => {
  await mount(page);
  const ids = await page.locator('[data-nest-pick]').evaluateAll((els) => els.map((e) => e.getAttribute('data-nest-pick') as string));
  expect(ids.length, 'nests in the list').toBeGreaterThanOrEqual(19);
  // Scene widths that stand for the nest's stated diameter (cup rim, platform,
  // mound, cavity chamber, burrow chamber, scrape).
  const BODY_IS_DIAMETER = new Set(['platform', 'cup', 'mound', 'cavity', 'burrow', 'scrape']);
  for (const id of ids) {
    await page.locator(`[data-nest-pick="${id}"]`).click();
    await page.waitForSelector(`svg[data-nest="${id}"]`);
    await expect(page.locator(`[data-nest-pick="${id}"]`)).toHaveAttribute('aria-pressed', 'true');
    const m = await measure(page);
    expect(m.label, `${id} label`).not.toMatch(/body-shape/);
    expect(m.eggs.length, `${id} has eggs`).toBeGreaterThanOrEqual(1);
    for (const e of m.eggs) {
      expect(Math.abs(e.len / (e.Lmm * m.pxPerMm) - 1), `${id}: an egg is ${(e.len / (e.Lmm * m.pxPerMm)).toFixed(2)}x its size at the nest's scale`).toBeLessThan(0.05);
      const slack = e.len * 0.5;
      const inBowl = e.cx > m.bowl.x0 - slack && e.cx < m.bowl.x1 + slack && e.cy > m.bowl.y0 - slack && e.cy < m.bowl.y1 + slack;
      expect(inBowl, `${id}: an egg at ${e.cx.toFixed(0)},${e.cy.toFixed(0)} is outside the nest`).toBe(true);
    }
    if (BODY_IS_DIAMETER.has(m.kind as string)) {
      // The body's drawn width, read at the declared scale, is the stated size.
      const drawnMm = (m.body.x1 - m.body.x0) / m.pxPerMm;
      expect(Math.abs(drawnMm / m.nestMm - 1), `${id}: nest drawn ${drawnMm.toFixed(0)} mm across, stated ${m.nestMm}`).toBeLessThan(0.1);
    }
  }
});

test('the eagle\'s eggs are tiny in its nest, the hummingbird\'s fill its cup', async ({ page }) => {
  await mount(page);
  const share = async (id: string) => {
    await page.locator(`[data-nest-pick="${id}"]`).click();
    await page.waitForSelector(`svg[data-nest="${id}"]`);
    const m = await measure(page);
    return m.eggs[0].len / (m.body.x1 - m.body.x0);
  };
  const eagle = await share('baldEagle');
  const humm = await share('rtHummingbird');
  // 73 mm eggs in a ~1.7 m nest, 13 mm eggs in a ~38 mm cup.
  expect(eagle, 'eagle egg share of nest width').toBeLessThan(0.07);
  expect(humm, 'hummingbird egg share of cup width').toBeGreaterThan(0.25);
});

test('the nest card is readable in the host shell', async ({ page }) => {
  await mount(page, true);
  await page.locator('[data-nest-pick="piping"]').click();
  await page.waitForSelector('svg[data-nest="piping"]');
  const bad = await page.evaluate(async () => {
    const r = await (window as any).axe.run(document.querySelector('#wrap'), { runOnly: { type: 'rule', values: ['color-contrast'] } });
    return (r.violations[0]?.nodes || []).map((n: any) => `${n.target[0]} ${n.any[0]?.data?.fgColor} on ${n.any[0]?.data?.bgColor}`);
  });
  expect(bad).toEqual([]);
});
