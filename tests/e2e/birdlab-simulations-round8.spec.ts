import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off' });
test.describe.configure({ mode: 'default', retries: 0, timeout: 180_000 });
const harness = new GlHarness({ toolId: 'birdLab', toolFile: 'stem_lab/stem_tool_birdlab.js', preScripts: ['stem_lab/stem_lab_module.js'],
  extraScripts: ['node_modules/axe-core/axe.min.js'], width: 1100, height: 960, appStyles: true, layout: 'document' });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function sizing(page: Page, viewport: number, host: number) {
  await page.setViewportSize({ width: viewport, height: 1000 });
  await page.evaluate(width => {
    const wrap = document.querySelector('#wrap') as HTMLElement;
    wrap.style.width = width + 'px'; wrap.style.maxWidth = '100%'; wrap.setAttribute('data-stem-tool-shell', 'true');
  }, host);
}
async function mount(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { birdLab: { view: 'wingTypes', wingSel: 'soaring', blXp: 0, blLifeList: {}, blBadges: {} } }, undefined, { expectCanvas: false });
  await sizing(page, 1280, 1100);
  await expect(page.locator('[data-birdlab-section-study]')).toBeVisible();
}
async function geometry(page: Page) {
  return page.locator('[data-birdlab-section-study]').evaluate(element => {
    const data = (element as HTMLElement).dataset;
    const svg = element.querySelector('[data-section-map]') as SVGSVGElement;
    function point(node: SVGGraphicsElement, x: number, y: number) {
      const matrix = svg.getCTM()!.inverse().multiply(node.getCTM()!);
      const p = new DOMPoint(x, y).matrixTransform(matrix); return { x: p.x, y: p.y };
    }
    function line(selector: string) {
      const node = element.querySelector(selector) as SVGLineElement;
      return [point(node, node.x1.baseVal.value, node.y1.baseVal.value), point(node, node.x2.baseVal.value, node.y2.baseVal.value)];
    }
    const body = element.querySelector('[data-section-body]') as SVGGElement;
    const trailing = element.querySelector('[data-section-trailing-edge]') as SVGCircleElement;
    const arc = element.querySelector('[data-section-angle-arc]') as SVGPathElement | null;
    const arcStart = arc ? arc.getPointAtLength(0) : null, arcEnd = arc ? arc.getPointAtLength(arc.getTotalLength()) : null;
    return { pitch: Number(data.sectionPitch), flow: Number(data.sectionFlow), alpha: Number(data.sectionAlpha),
      chord: line('[data-section-chord]'), airflow: line('[data-section-flow-guide]'), arrow: line('[data-section-air-arrow="0"]'),
      leading: point(body, 0, 0), trailing: point(body, 272, 0), marker: point(trailing, trailing.cx.baseVal.value, trailing.cy.baseVal.value),
      arcLength: arc ? arc.getTotalLength() : 0, arcStart: arcStart ? { x: arcStart.x, y: arcStart.y } : null,
      arcEnd: arcEnd ? { x: arcEnd.x, y: arcEnd.y } : null,
      outline: element.querySelector('[data-section-outline]')!.getAttribute('d') };
  });
}
async function verifyGeometry(page: Page, pitch: number, flow: number) {
  // Native SVG length can lag React attribute commits until paint on Chromium.
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  const g = await geometry(page);
  const direction = (p: { x: number, y: number }[]) => Math.atan2(p[1].y - p[0].y, p[1].x - p[0].x) * 180 / Math.PI;
  expect(g.pitch).toBe(pitch); expect(g.flow).toBe(flow); expect(g.alpha).toBe(pitch - flow);
  expect(direction(g.chord)).toBeCloseTo(pitch, 4); expect(direction(g.airflow)).toBeCloseTo(flow, 4);
  expect(direction(g.arrow)).toBeCloseTo(flow, 4); expect(direction([g.leading, g.trailing])).toBeCloseTo(pitch, 4);
  expect(g.marker.x).toBeCloseTo(g.trailing.x, 4); expect(g.marker.y).toBeCloseTo(g.trailing.y, 4);
  expect(Math.hypot(g.trailing.x - g.leading.x, g.trailing.y - g.leading.y)).toBeCloseTo(272, 3);
  expect(g.arcLength).toBeCloseTo(92 * Math.abs(pitch - flow) * Math.PI / 180, 1);
  if (g.arcStart && g.arcEnd) {
    expect(direction([g.leading, g.arcStart])).toBeCloseTo(flow, 4);
    expect(direction([g.leading, g.arcEnd])).toBeCloseTo(pitch, 4);
  }
  return g;
}
async function progress(page: Page) {
  return page.evaluate(() => {
    const data = (window as any).__toolData.birdLab;
    return { xp: data.blXp, sightings: data.blLifeList, badges: data.blBadges };
  });
}

test('wing-section chord, approaching-air arrows and native angle arc agree at positive, zero and negative angles', async ({ page }) => {
  await mount(page); const unchanged = await progress(page);
  await verifyGeometry(page, 12, 0);
  await page.locator('[data-section-preset="Aligned"]').click();
  await verifyGeometry(page, 0, 0);
  await expect(page.locator('[data-section-angle-arc]')).toHaveCount(0);
  await page.locator('#birdlab-section-pitch').press('Home');
  await page.locator('#birdlab-section-flow').press('End');
  await verifyGeometry(page, -20, 15);
  await expect(page.locator('[data-section-turn-together]')).toBeDisabled();
  await page.locator('#birdlab-section-pitch').press('End');
  await page.locator('#birdlab-section-flow').press('Home');
  await verifyGeometry(page, 25, -15);
  await expect(page.locator('[data-section-turn-together]')).toBeDisabled();
  await page.locator('[data-section-preset="Tilt the air"]').click();
  await verifyGeometry(page, 0, -12);
  await page.locator('[data-section-turn-together]').click();
  await verifyGeometry(page, 5, -7);
  expect(await progress(page)).toEqual(unchanged);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('pinned sections preserve their shape and angles while live orientation and wing type change', async ({ page }) => {
  await mount(page); const unchanged = await progress(page);
  await page.locator('[data-section-pin]').click();
  const original = await verifyGeometry(page, 12, 0);
  const pin = page.locator('[data-section-pinned-geometry]');
  const saved = await pin.evaluate(element => ({ data: { ...(element as HTMLElement).dataset }, html: element.innerHTML }));
  await page.locator('[data-section-preset="Tilt the air"]').click();
  await verifyGeometry(page, 0, -12);
  await expect(page.locator('[data-section-comparison]')).toContainText('Same angle of attack');
  await page.getByRole('button', { name: 'Aquatic Wings', exact: true }).click();
  const aquatic = await verifyGeometry(page, 0, -12);
  expect(aquatic.outline).not.toBe(original.outline);
  expect(await pin.evaluate(element => ({ data: { ...(element as HTMLElement).dataset }, html: element.innerHTML }))).toEqual(saved);
  await page.locator('#birdlab-section-pitch').press('ArrowRight');
  await verifyGeometry(page, 1, -12);
  await expect(page.locator('[data-section-comparison]')).toContainText('1° greater');
  await page.locator('[data-section-guides-toggle]').click();
  await expect(page.locator('[data-section-guides]')).toHaveCount(0);
  await expect(page.locator('[data-section-inflow]')).toBeVisible();
  await expect(pin).toBeVisible();
  await page.locator('[data-section-guides-toggle]').click();
  await verifyGeometry(page, 1, -12);
  await page.locator('[data-section-pin]').click();
  await expect(pin).toHaveAttribute('data-section-pinned-pitch', '1');
  await expect(pin).toHaveAttribute('data-section-pinned-flow', '-12');
  expect(await page.locator('[data-section-pinned-outline]').getAttribute('d')).toBe(aquatic.outline);
  await page.getByRole('button', { name: 'Clear pinned section', exact: true }).click();
  await expect(pin).toHaveCount(0);
  expect(await progress(page)).toEqual(unchanged);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('wing-section controls remain keyboard-operable and contained on desktop, phone and embedded layouts', async ({ page }) => {
  await mount(page); await page.locator('[data-section-pin]').click();
  const slider = page.locator('#birdlab-section-pitch');
  for (const layout of [{ viewport: 1280, host: 1100 }, { viewport: 390, host: 390 }, { viewport: 1280, host: 500 }]) {
    await sizing(page, layout.viewport, layout.host);
    await page.locator('[data-section-preset="Aligned"]').click();
    await slider.focus(); await page.keyboard.press('Home'); await expect(slider).toBeFocused();
    await verifyGeometry(page, -20, 0);
    await page.keyboard.press('ArrowRight'); await expect(slider).toBeFocused();
    await verifyGeometry(page, -19, 0);
    await page.keyboard.press('End'); await verifyGeometry(page, 25, 0);
    const host = await page.locator('#wrap').boundingBox();
    for (const selector of ['[data-birdlab-section-study]', '[data-section-map]', '#birdlab-section-pitch', '#birdlab-section-flow', '[data-section-reference]']) {
      const target = page.locator(selector), box = await target.boundingBox(), context = `${selector} at viewport ${layout.viewport}/host ${layout.host}`;
      expect(box!.x, context).toBeGreaterThanOrEqual(host!.x - 1); expect(box!.x + box!.width, context).toBeLessThanOrEqual(host!.x + host!.width + 1);
      expect(await target.evaluate(element => element.scrollWidth - element.clientWidth), context).toBeLessThanOrEqual(1);
    }
    const map = await page.locator('[data-section-map]').boundingBox(); expect(map!.width).toBeGreaterThan(290);
    const violations = await page.evaluate(async () => {
      const report = await (window as any).axe.run(document.querySelector('[data-birdlab-section-study]'), { runOnly: { type: 'rule', values: ['color-contrast', 'button-name', 'select-name', 'label', 'aria-valid-attr-value', 'aria-required-children', 'aria-required-parent', 'nested-interactive'] } });
      return report.violations.map((item: any) => ({ id: item.id, targets: item.nodes.map((node: any) => node.target) }));
    });
    expect(violations).toEqual([]);
  }
  const before = await geometry(page); await page.waitForTimeout(150); expect(await geometry(page)).toEqual(before);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
