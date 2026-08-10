import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_pets.js',
  toolId: 'petsLab',
  width: 900,
  height: 900,
});

function seed(view: string, extra: Record<string, unknown> = {}) {
  return { petsLab: Object.assign({ view }, extra) };
}

async function setWidth(page: Page, width: number) {
  await page.setViewportSize({ width, height: 1000 });
  await page.locator('#wrap').evaluate((el, w) => {
    (el as HTMLElement).style.width = `${w}px`;
  }, width);
  await page.waitForTimeout(150);
}

async function expectContained(page: Page, width: number) {
  const state = await page.evaluate(() => ({
    viewport: window.innerWidth,
    pageWidth: document.documentElement.scrollWidth,
    wrapWidth: document.getElementById('wrap')?.scrollWidth || 0,
    finite: !/NaN|Infinity/.test(document.getElementById('wrap')?.innerHTML || ''),
    errors: (window as any).__events.errors,
  }));
  expect(state.pageWidth).toBeLessThanOrEqual(width);
  expect(state.wrapWidth).toBeLessThanOrEqual(width);
  expect(state.finite).toBe(true);
  expect(state.errors).toEqual([]);
}

async function expectVisibleSvgTextClear(page: Page) {
  const result = await page.locator('.petslab-diagram-narrow:visible').evaluate((svg) => {
    const svgBox = svg.getBoundingClientRect();
    const rects = Array.from(svg.querySelectorAll('text')).map((node) => {
      const box = node.getBoundingClientRect();
      return { text: node.textContent || '', left: box.left, right: box.right, top: box.top, bottom: box.bottom, height: box.height };
    }).filter((r) => r.text.trim());
    const outside = rects.filter((r) => r.left < svgBox.left - 1 || r.right > svgBox.right + 1 || r.top < svgBox.top - 1 || r.bottom > svgBox.bottom + 1);
    const overlaps: string[] = [];
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i], b = rects[j];
        const overlapW = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const overlapH = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (overlapW > 3 && overlapH > 3) overlaps.push(`${a.text} <> ${b.text}`);
      }
    }
    return { outside, overlaps, minHeight: Math.min(...rects.map((r) => r.height)) };
  });
  expect(result.outside).toEqual([]);
  expect(result.overlaps).toEqual([]);
  expect(result.minHeight).toBeGreaterThanOrEqual(9);
}

test.describe('Pet Lab illustrated reference and responsive diagrams', () => {
  test.describe.configure({ timeout: 150_000 });
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  test('Body Language reference renders all 27 compact observable poses', async ({ page }) => {
    await harness.mount(page, seed('bodyLang', { blMode: 'read' }), undefined, { expectCanvas: false });
    await setWidth(page, 900);
    await expect(page.locator('.petslab-body-reference-group')).toHaveCount(4);
    await expect(page.locator('.petslab-body-reference-card')).toHaveCount(27);
    await expect(page.locator('.petslab-body-pose--compact svg[role="img"]')).toHaveCount(27);
    await expect(page.locator('.petslab-body-pose--compact title')).toHaveCount(27);
    await expect(page.locator('.petslab-body-pose--compact desc')).toHaveCount(27);
    await expect(page.locator('.petslab-body-pose--compact .petslab-body-cues')).toHaveCount(0);

    await setWidth(page, 390);
    const columns = await page.locator('.petslab-body-reference-grid').first().evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length);
    expect(columns).toBe(1);
    const copySize = await page.locator('.petslab-body-reference-signal').first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(copySize).toBeGreaterThanOrEqual(11);
    await expectContained(page, 390);
  });

  for (const diagramView of ['skull', 'operant'] as const) {
    test(`${diagramView} diagram switches cleanly between wide and stacked layouts`, async ({ page }) => {
      await harness.mount(page, seed('diagrams', { diagramView }), undefined, { expectCanvas: false });

      await setWidth(page, 900);
      const art = page.locator('.petslab-diagram-responsive-art');
      await expect(art).toHaveCount(1);
      await expect(art.locator('.petslab-diagram-wide')).toBeVisible();
      await expect(art.locator('.petslab-diagram-narrow')).toBeHidden();

      await setWidth(page, 390);
      await expect(art.locator('.petslab-diagram-wide')).toBeHidden();
      await expect(art.locator('.petslab-diagram-narrow')).toBeVisible();
      await expect(art.locator('.petslab-diagram-narrow title')).toHaveCount(1);
      await expect(art.locator('.petslab-diagram-narrow desc')).toHaveCount(1);
      await expectVisibleSvgTextClear(page);
      await expectContained(page, 390);

      await page.evaluate(() => document.body.classList.add('reduce-motion'));
      const flow = art.locator('.petslab-diagram-flow').first();
      if (await flow.count()) await expect(flow).toHaveCSS('animation-name', 'none');
    });
  }
});
