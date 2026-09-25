/**
 * Bird Lab — Maine Owls: a line-up drawn to one scale.
 *
 * The owl view was all text. It now opens with Maine's eight owls standing
 * side by side at one scale (length mid-points from each profile's size),
 * ear tufts drawn only on the species that have them, and eye colour as the
 * field mark it is (the Barred Owl's are dark; the others yellow). Each owl
 * is a button that opens its profile.
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

async function mount(page: Page, shell = false) {
  await page.goto(`${(harness as any).base}/__harness`);
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.birdLab, null, { timeout: 30000 });
  await page.evaluate(({ shim, shell }) => {
    if (shell) {
      const wrap = document.querySelector('#wrap') as HTMLElement;
      wrap.setAttribute('data-stem-tool-shell', 'true'); wrap.style.background = '#0f172a'; wrap.style.color = '#e2e8f0';
      const st = document.createElement('style'); st.textContent = shim; document.head.appendChild(st);
    }
    (window as any).__mount({ birdLab: { view: 'owls' } });
  }, { shim: SHIM, shell });
  await page.waitForSelector('[data-owl-lineup] [data-owl]');
}

const owls = (page: Page) => page.evaluate(() => [...document.querySelectorAll('[data-owl]')].map((g) => {
  const fig = g.querySelector('[data-owl-figure]') as SVGGraphicsElement;
  const eye = g.querySelector('[data-owl-eye]') as SVGCircleElement;
  const rgb = (getComputedStyle(eye).fill.match(/\d+/g) || []).map(Number);
  return {
    name: g.getAttribute('data-owl') as string,
    len: Number(g.getAttribute('data-owl-len')),
    height: fig.getBoundingClientRect().height,
    tufts: g.querySelectorAll('[data-owl-part="tuft"]').length,
    eyeLum: (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255,
  };
}));

test('eight owls at one scale, with the scale bar at the same scale', async ({ page }) => {
  await mount(page);
  const rows = await owls(page);
  expect(rows.length).toBe(8);
  // Tufts rise above the head, so compare each owl's drawn height per inch
  // against the tuftless ones only (the body + head is the measured length).
  const plain = rows.filter((r) => r.tufts === 0);
  const ref = plain[0].height / plain[0].len;
  for (const r of plain) expect(Math.abs(r.height / r.len / ref - 1), `${r.name} scale`).toBeLessThan(0.06);
  const bar = await page.evaluate(() => (document.querySelector('[data-owl-scalebar] path') as SVGGraphicsElement).getBoundingClientRect().height);
  expect(Math.abs(bar / 12 / ref - 1), 'scale bar').toBeLessThan(0.08);
  // Largest to smallest, left to right.
  for (let i = 1; i < rows.length; i++) expect(rows[i].len).toBeLessThanOrEqual(rows[i - 1].len);
});

test('ear tufts only where the species has them; the Barred Owl alone has dark eyes', async ({ page }) => {
  await mount(page);
  const rows = Object.fromEntries((await owls(page)).map((r) => [r.name, r]));
  for (const n of ['Great Horned Owl', 'Long-eared Owl', 'Eastern Screech-Owl', 'Short-eared Owl']) expect(rows[n].tufts, `${n} tufts`).toBe(2);
  for (const n of ['Barred Owl', 'Snowy Owl', 'Northern Saw-whet Owl', 'Boreal Owl']) expect(rows[n].tufts, `${n} tufts`).toBe(0);
  expect(rows['Barred Owl'].eyeLum, 'Barred Owl eyes').toBeLessThan(0.3);
  for (const [n, r] of Object.entries(rows)) if (n !== 'Barred Owl') expect(r.eyeLum, `${n} eyes`).toBeGreaterThan(0.5);
});

test('an owl in the line-up opens its profile, by click or keyboard', async ({ page }) => {
  await mount(page);
  await page.locator('[data-owl="Snowy Owl"]').click();
  await expect(page.getByRole('heading', { name: /Snowy Owl \(Bubo scandiacus\)/ })).toBeVisible();
  await expect(page.locator('[data-owl="Snowy Owl"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-owl="Northern Saw-whet Owl"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: /Northern Saw-whet Owl/ })).toBeVisible();
});

test('owl view is readable in the host shell', async ({ page }) => {
  await mount(page, true);
  const bad = await page.evaluate(async () => {
    const r = await (window as any).axe.run(document.querySelector('#wrap'), { runOnly: { type: 'rule', values: ['color-contrast'] } });
    return (r.violations[0]?.nodes || []).map((n: any) => `${n.target[0]} ${n.any[0]?.data?.fgColor} on ${n.any[0]?.data?.bgColor}`);
  });
  expect(bad).toEqual([]);
});
