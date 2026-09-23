/**
 * Bird Lab — Feather Anatomy: a real flight feather, each ring on its part.
 *
 * The diagram was a symmetric blue shield with hand-typed ring positions: the
 * "barbule" ring sat off the feather, "aftershaft" floated beside the shaft,
 * and nothing showed that a flight feather's outer vane is narrow and its
 * inner vane wide. Now each part the rings name is a drawn shape carrying
 * data-part, and the rings take their positions from the drawing.
 *
 * Asked the way a student's eye asks it: is each numbered ring's centre on the
 * shape it names (measured through the screen transform, so a transform on a
 * wrapper cannot fool it), and do the rings stay clear of each other?
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

test.describe.configure({ timeout: 300_000 });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function mount(page: Page) {
  await page.goto(`${(harness as any).base}/__harness`);
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.birdLab, null, { timeout: 30000 });
  await page.evaluate(() => (window as any).__mount({ birdLab: { view: 'featherAnatomy' } }));
  await page.waitForSelector('[data-feather-ring]', { timeout: 30000 });
}

test('every ring sits on the part it names, and rings do not overlap', async ({ page }) => {
  await mount(page);
  const res = await page.evaluate(() => {
    const rings = [...document.querySelectorAll('[data-feather-ring]')] as SVGCircleElement[];
    const out = { rings: rings.length, off: [] as string[], centres: [] as { id: string; x: number; y: number; r: number }[] };
    for (const ring of rings) {
      const id = ring.getAttribute('data-feather-ring') as string;
      const c = new DOMPoint(Number(ring.getAttribute('cx')), Number(ring.getAttribute('cy'))).matrixTransform(ring.getScreenCTM() as DOMMatrix);
      const rr = ring.getBoundingClientRect();
      out.centres.push({ id, x: c.x, y: c.y, r: rr.width / 2 });
      const parts = [...document.querySelectorAll(`[data-part="${id}"]`)] as SVGGeometryElement[];
      const hit = parts.some((el) => {
        const local = c.matrixTransform((el.getScreenCTM() as DOMMatrix).inverse());
        const p = (el.ownerSVGElement as SVGSVGElement).createSVGPoint(); p.x = local.x; p.y = local.y;
        return el.isPointInFill(p);
      });
      if (!parts.length || !hit) out.off.push(id);
    }
    return out;
  });
  expect(res.rings, 'numbered rings').toBe(8);
  expect(res.off, 'rings not on the part they name').toEqual([]);
  for (let i = 0; i < res.centres.length; i++) {
    for (let j = i + 1; j < res.centres.length; j++) {
      const a = res.centres[i], b = res.centres[j];
      expect(Math.hypot(a.x - b.x, a.y - b.y), `${a.id} and ${b.id} overlap`).toBeGreaterThan(a.r + b.r - 1);
    }
  }
});

test('a flight feather: the inner vane is much wider than the outer vane', async ({ page }) => {
  await mount(page);
  // Scan across the feather at the shaft's mid-height and count how far each
  // vane reaches (bounding boxes would fold in the shaft's curve).
  const w = await page.evaluate(() => {
    const [a, b] = [...document.querySelectorAll('[data-part="vane"]')] as SVGGeometryElement[];
    const shaft = (document.querySelector('[data-part="rachis"]') as SVGGraphicsElement).getBoundingClientRect();
    const y = shaft.top + shaft.height * 0.5;
    const width = (el: SVGGeometryElement) => {
      const toLocal = (el.getScreenCTM() as DOMMatrix).inverse(), svg = el.ownerSVGElement as SVGSVGElement;
      let n = 0;
      for (let x = shaft.left - 200; x < shaft.right + 200; x += 0.5) {
        const l = new DOMPoint(x, y).matrixTransform(toLocal), p = svg.createSVGPoint(); p.x = l.x; p.y = l.y;
        if (el.isPointInFill(p)) n++;
      }
      return n * 0.5;
    };
    const wa = width(a), wb = width(b);
    return { inner: Math.max(wa, wb), outer: Math.min(wa, wb) };
  });
  expect(w.inner / w.outer, 'vane asymmetry').toBeGreaterThan(2);
});

test('choosing a ring explains the part, with the corrected keratin fact', async ({ page }) => {
  await mount(page);
  await page.locator('[data-feather-part="rachis"]').click();
  await expect(page.getByText(/Feathers use beta-keratin/)).toBeVisible();
  await page.locator('[data-feather-part="downy"]').click();
  await expect(page.getByRole('heading', { name: /Downy base/ })).toBeVisible();
  await expect(page.getByText(/stronger by weight than steel/)).toHaveCount(0);
});
