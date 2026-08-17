/**
 * Bird Lab I-Spy on a phone — the composition nothing else can see.
 *
 * The tool's own visual-QA harness (dev-tools/birdlab_visual_qa.mjs) renders through
 * renderToStaticMarkup, so `sceneViewportWidth` is 0. The tool reads 0 as "not measured
 * yet" and deliberately stays on the wide sweep, which means EVERY "mobile" screenshot
 * that harness has ever produced is the desktop composition squeezed into 390px. The
 * small-stage lens auto-focus — the thing that actually makes birds findable on a phone
 * — never fires there, because it is driven by a ResizeObserver measurement that
 * static rendering does not perform.
 *
 * So this mounts the REAL tool at a real phone viewport and asserts on measured pixels:
 * that the scene fits its column, that the lens narrows itself, and that the birds end
 * up big enough to identify rather than 7px specks.
 */
import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolId: 'birdLab',
  toolFile: 'stem_lab/stem_tool_birdlab.js',
  preScripts: ['stem_lab/stem_lab_module.js'],
  width: 390,
  height: 844,
});

test.describe.configure({ timeout: 300_000 });
test.use({ viewport: { width: 390, height: 844 } });

test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function mountISpy(page: import('@playwright/test').Page) {
  await page.goto(`${(harness as any).base}/__harness`);
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.birdLab, null, { timeout: 30000 });
  // The shared harness gives #wrap `display:flex`, which makes the tool root a flex
  // ITEM with the default `min-width:auto` — so it refuses to shrink below its content
  // and the scene measures 540px inside a 390px viewport. The REAL host does not do
  // that: StemLab.renderTool wraps every tool in a plain block div (stem_lab_module.js
  // ~:1560, background/borderRadius/minHeight/padding, no display). Testing against the
  // flex wrap would be testing a layout the app never has, and reporting a phone bug
  // that does not exist. Restore the host's box model before mounting.
  await page.addStyleTag({ content: '#wrap{display:block !important}' });
  await page.evaluate(() => (window as any).__mount({ birdLab: { view: 'ispy' } }));
  await page.waitForSelector('[data-birdlab-realistic-scene]', { timeout: 30000 });
  // The lens auto-focus rides a ResizeObserver, so it lands a frame or two after mount.
  await page.waitForTimeout(600);
}

test('the scene fits the phone column and does not scroll sideways', async ({ page }) => {
  await mountISpy(page);
  const fit = await page.evaluate(() => {
    const svg = document.querySelector('[data-birdlab-realistic-scene]') as SVGElement;
    const box = svg.getBoundingClientRect();
    return {
      sceneWidth: box.width,
      docScrollWidth: document.documentElement.scrollWidth,
      docClientWidth: document.documentElement.clientWidth,
    };
  });
  // An aspect-ratio + min-height box with no max-width sizes itself from the HEIGHT and
  // ignores its container; that shipped once and pushed the whole tool sideways at 390px.
  expect(fit.sceneWidth).toBeLessThanOrEqual(fit.docClientWidth);
  expect(fit.docScrollWidth).toBeLessThanOrEqual(fit.docClientWidth + 1);
});

test('the lens narrows itself on a phone-sized stage', async ({ page }) => {
  await mountISpy(page);
  const lens = await page.evaluate(() => {
    const svg = document.querySelector('[data-birdlab-realistic-scene]') as SVGElement;
    const vb = (svg.getAttribute('viewBox') || '').split(/\s+/).map(Number);
    return { viewBoxWidth: vb[2], lens: svg.getAttribute('data-birdlab-scene-lens') };
  });
  // Auto-focus crops the sweep to a sector; inflating SCENE_SPECIES_SCALE instead would
  // flatten the relative species sizes the whole field-ID lesson rests on.
  expect(lens.viewBoxWidth, 'still showing the full 900-unit sweep on a phone').toBeLessThan(900);
});

test('birds are large enough to identify, not specks', async ({ page }) => {
  await mountISpy(page);
  const birds = await page.evaluate(() => {
    const card = document.querySelector('[data-birdlab-scene-shell]') as HTMLElement;
    const cb = card.getBoundingClientRect();
    const out: { species: string; w: number; h: number; presence: string; visible: number }[] = [];
    document.querySelectorAll('[data-birdlab-species]').forEach((n) => {
      const r = (n as HTMLElement).getBoundingClientRect();
      if (r.width < 0.5) return;
      // getBoundingClientRect still returns a box for SVG content clipped out of
      // view, so "has a rect" is not "is on screen" — measure overlap with the card.
      const ox = Math.max(0, Math.min(r.right, cb.right) - Math.max(r.left, cb.left));
      const oy = Math.max(0, Math.min(r.bottom, cb.bottom) - Math.max(r.top, cb.top));
      out.push({
        species: n.getAttribute('data-birdlab-species') || '?',
        w: r.width, h: r.height,
        presence: n.getAttribute('data-birdlab-presence') || '',
        visible: (ox * oy) / (r.width * r.height),
      });
    });
    return out;
  });
  expect(birds.length, 'no birds rendered at all').toBeGreaterThan(0);
  // Size is not enough: a bird can be large AND clipped out of the card. The
  // auto-focus used to make birds 2x bigger and then slice half the scene height
  // away, putting the only findable bird 3px below the card's bottom edge.
  const findable = birds.filter((b) => b.presence === 'visible');
  expect(findable.length, 'no bird is currently findable').toBeGreaterThan(0);
  for (const b of findable) {
    expect(b.visible, `${b.species} is findable but ${Math.round(b.visible * 100)}% on screen`).toBeGreaterThan(0.6);
  }
  // Measured, not eyeballed. The smallest songbirds once came out at 7-12 CSS px across
  // on a 390px stage, which is below what anyone can put a field mark on.
  for (const b of birds) {
    expect(b.w, `${b.species} is ${Math.round(b.w)}px wide on a phone`).toBeGreaterThan(14);
  }
});
