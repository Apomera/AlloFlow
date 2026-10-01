/**
 * Bird Lab — Maine Raptors: silhouettes from below, to one wingspan scale.
 *
 * Raptors are identified overhead by shape, and the raptor view was all text.
 * It now opens with the twelve profiles drawn from below: wingspan to one
 * scale, body length from each profile's own length/wingspan, the outline
 * from its group (eagle, Osprey, buteo, accipiter, harrier, falcon, vulture)
 * and only the underside marks that identify it.
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
    (window as any).__mount({ birdLab: { view: 'raptors' } });
  }, { shim: SHIM, shell });
  await page.waitForSelector('[data-raptor-lineup] [data-raptor]');
}

const birds = (page: Page) => page.evaluate(() => [...document.querySelectorAll('[data-raptor]')].map((g) => {
  const wings = [...g.querySelectorAll('[data-raptor-part="wing"]')].map((w) => w.getBoundingClientRect());
  const left = Math.min(...wings.map((r) => r.left)), right = Math.max(...wings.map((r) => r.right));
  const tail = (g.querySelector('[data-raptor-part="tail"]') as SVGGraphicsElement).getBoundingClientRect();
  const marks = [...g.querySelectorAll('[data-raptor-mark]')].map((m) => m.getAttribute('data-raptor-mark'));
  const head = g.querySelector('[data-raptor-part="head"]') as SVGCircleElement;
  return { name: g.getAttribute('data-raptor') as string, shape: g.getAttribute('data-raptor-shape') as string,
    span: Number(g.getAttribute('data-raptor-span')), wingPx: right - left, tailRatio: tail.height / (right - left), marks, head: getComputedStyle(head).fill };
}));

test('twelve raptors, wingspans to one scale, shapes by group', async ({ page }) => {
  await mount(page);
  const rows = await birds(page);
  expect(rows.length).toBe(12);
  const ref = rows[0].wingPx / rows[0].span;
  for (const r of rows) expect(Math.abs(r.wingPx / r.span / ref - 1), `${r.name} wingspan scale`).toBeLessThan(0.08);
  const shape = Object.fromEntries(rows.map((r) => [r.name, r.shape]));
  expect(shape['Bald Eagle']).toBe('eagle');
  expect(shape['Osprey']).toBe('osprey');
  expect(shape['Turkey Vulture']).toBe('vulture');
  expect(shape['Northern Harrier']).toBe('harrier');
  for (const n of ['Red-tailed Hawk', 'Broad-winged Hawk']) expect(shape[n]).toBe('buteo');
  for (const n of ['Cooper\'s Hawk', 'Sharp-shinned Hawk', 'American Goshawk']) expect(shape[n]).toBe('accipiter');
  for (const n of ['American Kestrel', 'Merlin', 'Peregrine Falcon']) expect(shape[n]).toBe('falcon');
  // The accipiter "flying cross": a long tail for its short wings, longer than a buteo's.
  const byName = Object.fromEntries(rows.map((r) => [r.name, r]));
  expect(byName['Cooper\'s Hawk'].tailRatio).toBeGreaterThan(byName['Red-tailed Hawk'].tailRatio * 1.3);
});

test('each bird carries the underside mark that identifies it', async ({ page }) => {
  await mount(page);
  const byName = Object.fromEntries((await birds(page)).map((r) => [r.name, r]));
  expect(byName['Osprey'].marks).toContain('carpal');
  expect(byName['Red-tailed Hawk'].marks).toEqual(expect.arrayContaining(['patagial', 'bellyband']));
  expect(byName['Broad-winged Hawk'].marks).toContain('trailing');
  expect(byName['Northern Harrier'].marks).toContain('tips');
  expect(byName['Bald Eagle'].head).toBe('rgb(250, 250, 247)');
  expect(byName['Turkey Vulture'].head).toBe('rgb(220, 38, 38)');
});

test('a silhouette opens its profile', async ({ page }) => {
  await mount(page);
  await page.locator('[data-raptor="Merlin"]').click();
  await expect(page.getByRole('heading', { name: /Merlin \(Falco columbarius\)/ })).toBeVisible();
  await expect(page.locator('[data-raptor="Merlin"]')).toHaveAttribute('aria-pressed', 'true');
});

test('raptor view is readable in the host shell', async ({ page }) => {
  await mount(page, true);
  const bad = await page.evaluate(async () => {
    const r = await (window as any).axe.run(document.querySelector('#wrap'), { runOnly: { type: 'rule', values: ['color-contrast'] } });
    return (r.violations[0]?.nodes || []).map((n: any) => `${n.target[0]} ${n.any[0]?.data?.fgColor} on ${n.any[0]?.data?.bgColor}`);
  });
  expect(bad).toEqual([]);
});
