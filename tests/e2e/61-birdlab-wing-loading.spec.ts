/**
 * Bird Lab — Wing Loading Lab: measured birds, real-unit physics, a notebook.
 *
 * The old hidden widget took wing areas up to 10 m², reported loading in g/m²
 * about 100x low, said the albatross glides on thermals, never showed what
 * "Log" recorded, and its Back button did not leave. These checks reach it
 * from the menu and back, read each bird's numbers against the published
 * measurements, move the sliders, and plot only what the student logs.
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

async function mount(page: Page, state: Record<string, unknown>, width = 1100) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(`${(harness as any).base}/__harness`);
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.birdLab, null, { timeout: 30000 });
  await page.evaluate(({ s, w }) => {
    (document.querySelector('#wrap') as HTMLElement).style.width = w + 'px';
    (window as any).__mount({ birdLab: s });
  }, { s: state, w: width });
}

// Alerstam et al. 2007 (PLoS Biology), Protocol S1: kg, m, m². Albatross: typical.
const BIRD: Record<string, [string, number, number, number]> = {
  albatross: ['Wandering Albatross', 8.5, 3.1, 0.6],
  rtLoon: ['Red-throated Loon', 1.505, 1.04, 0.089],
  wtEagle: ['White-tailed Eagle', 4.967, 2.18, 0.8824],
  barnSwallow: ['Barn Swallow', 0.016, 0.32, 0.0136],
  mallard: ['Mallard', 1.082, 0.88, 0.1062],
};
const physics = (m: number, s: number) => {
  const wl = (m * 9.81) / s;
  return { wl, mph: Math.sqrt((2 * wl) / (1.225 * 1.6)) * 2.23694 };
};
const readouts = (page: Page) => page.evaluate(() =>
  Object.fromEntries([...document.querySelectorAll('[data-wl-readout]')].map((t) => [t.getAttribute('data-wl-readout'), t.textContent])));

test('on the menu, and Back returns to it', async ({ page }) => {
  await mount(page, { view: 'menu' });
  const card = page.getByRole('button', { name: /^Wing Loading Lab/ });
  await card.scrollIntoViewIfNeeded();
  await card.click();
  await expect(page.getByRole('heading', { level: 1, name: /Wing Loading Lab/ })).toBeVisible();
  await page.getByRole('button', { name: '← Menu' }).click();
  await expect(page.getByRole('button', { name: /^Wing Loading Lab/ })).toBeVisible();
});

test('each measured bird shows its own span, loading and slowest flight, drawn to scale', async ({ page }) => {
  await mount(page, { view: 'wingHunt' });
  for (const [id, [name, m, b, s]] of Object.entries(BIRD)) {
    await page.locator(`[data-wl-bird="${id}"]`).click();
    await expect(page.locator(`[data-wl-bird="${id}"]`)).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-wl-subject]')).toHaveAttribute('data-wl-subject', id);
    const r = await readouts(page);
    const p = physics(m, s);
    const span = b < 1 ? `${Math.round(b * 100)} cm` : `${b.toFixed(2)} m`;
    expect(r.span, name).toContain(span);
    expect(r.loading, name).toContain(`${Math.round(p.wl)} N/m²`);
    expect(r.aspect, name).toContain(((b * b) / s).toFixed(1));
    expect(r.slowest, name).toContain(`${Math.round(p.mph)} mph`);
    // The planform's drawn span, at its own scale, is the real span; the
    // scale bar is drawn at that same scale.
    const g = await page.evaluate(() => {
      const svg = document.querySelector('[data-birdlab-wing-planform]')!;
      const bar = svg.querySelector('[data-scale-bar] path')!.getAttribute('d')!;
      return { spanPx: Number(svg.getAttribute('data-span-px')), pxPerM: Number(svg.getAttribute('data-px-per-m')), scale: Number(svg.getAttribute('data-scale-m')),
        barPx: Number(/h ([\d.]+)/.exec(bar)![1]) };
    });
    expect(g.spanPx / g.pxPerM, name).toBeCloseTo(b, 2);
    expect(g.barPx / g.pxPerM, name).toBeCloseTo(g.scale, 2);
  }
  // The albatross soars on wind, not thermals; the loon patters to take off.
  await page.locator('[data-wl-bird="albatross"]').click();
  await expect(page.locator('[data-wl-subject]')).toContainText('wind');
  await expect(page.locator('[data-wl-subject]')).not.toContainText('thermal');
  await page.locator('[data-wl-bird="rtLoon"]').click();
  await expect(page.locator('[data-wl-subject]')).toContainText('patters across the water');
});

test('a slider move makes it your own bird, and the numbers follow', async ({ page }) => {
  await mount(page, { view: 'wingHunt' });
  await page.locator('[data-wl-bird="mallard"]').click();
  const mass = page.locator('#wh-mass');
  await mass.focus();
  for (let i = 0; i < 40; i++) await page.keyboard.press('ArrowRight');
  await expect(page.locator('[data-wl-subject]')).toHaveAttribute('data-wl-subject', 'custom');
  await expect(page.locator('[data-wl-bird="mallard"]')).toHaveAttribute('aria-pressed', 'false');
  // Loading = the shown mass x g / the shown area.
  const shown = await page.evaluate(() => ({
    mass: document.querySelector('#wh-mass')!.getAttribute('aria-valuetext')!,
    area: document.querySelector('#wh-area')!.getAttribute('aria-valuetext')!,
  }));
  const kg = /kg/.test(shown.mass) ? parseFloat(shown.mass) : parseFloat(shown.mass.replace(/,/g, '')) / 1000;
  const m2 = parseFloat(shown.area.replace(/,/g, '')) / 1e4;
  expect(kg).toBeGreaterThan(1.082);
  const r = await readouts(page);
  const wl = Number(/(\d+) N\/m²/.exec(r.loading!)![1]);
  expect(Math.abs(wl - (kg * 9.81) / m2) / wl).toBeLessThan(0.02);
  // A made-up giant gets told it is beyond any flying bird.
  await mass.focus();
  await page.keyboard.press('End');
  await expect(page.locator('[data-wl-warn="heavy"]')).toBeVisible();
});

test('the notebook plots only what you log, once each', async ({ page }) => {
  await mount(page, { view: 'wingHunt' });
  await expect(page.locator('[data-wl-notebook]')).toHaveAttribute('data-wl-notebook', '0');
  await expect(page.locator('[data-wl-notebook]')).toContainText('Log a bird');
  for (const id of ['wtEagle', 'albatross', 'rtLoon', 'wtEagle']) {
    await page.locator(`[data-wl-bird="${id}"]`).click();
    await page.locator('[data-wl-log]').click();
  }
  const got = await page.evaluate(() => {
    const svg = document.querySelector('[data-wl-notebook]')!;
    return { x0: Number(svg.getAttribute('data-x0')), x1: Number(svg.getAttribute('data-x1')), lo: Number(svg.getAttribute('data-lo')), hi: Number(svg.getAttribute('data-hi')),
      dots: [...svg.querySelectorAll('[data-wl-dot]')].map((g) => ({ name: g.getAttribute('data-wl-dot'), cx: Number(g.querySelector('circle')!.getAttribute('cx')), fly: g.getAttribute('data-fly') })),
      rows: [...document.querySelectorAll('[data-wl-list] li')].map((li) => li.textContent) };
  });
  // The eagle logged twice appears once, at the end.
  expect(got.dots.map((d) => d.name)).toEqual(['Wandering Albatross', 'Red-throated Loon', 'White-tailed Eagle']);
  for (const d of got.dots) {
    const key = Object.keys(BIRD).find((k) => BIRD[k][0] === d.name)!;
    const [, m, , s] = BIRD[key];
    const wl = (m * 9.81) / s;
    const x = got.x0 + (Math.log(wl / got.lo) / Math.log(got.hi / got.lo)) * (got.x1 - got.x0);
    expect(d.cx, d.name).toBeCloseTo(x, 0);
  }
  expect(got.dots.map((d) => d.fly)).toEqual(['wind', 'fast', 'soarer']);
  expect(got.rows.length).toBe(3);
  expect(got.rows[1]).toContain('Red-throated Loon');
  expect(got.rows[1]).toContain('wing loading 166 N/m²');
});

test('an old save keeps only the written answers', async ({ page }) => {
  await mount(page, { view: 'wingHunt', wingHunt: { wingArea: 4, mass: 500, ar: 8, hypothesis: 'broad wings soar', log: [{ wa: 4, m: 500, ar: 8, st: 'general' }] } });
  await expect(page.locator('textarea').first()).toHaveValue('broad wings soar');
  await expect(page.locator('[data-wl-notebook]')).toHaveAttribute('data-wl-notebook', '0');
  expect((await readouts(page)).loading).toContain('49 N/m²');
});

test('no sideways scroll on a 390px phone', async ({ page }) => {
  await mount(page, { view: 'wingHunt' }, 390);
  const over = await page.evaluate(() => {
    const wrap = document.querySelector('#wrap') as HTMLElement;
    return wrap.scrollWidth - wrap.clientWidth;
  });
  expect(over, 'horizontal overflow in px').toBeLessThanOrEqual(1);
});
