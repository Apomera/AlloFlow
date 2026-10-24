import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off' });
test.describe.configure({ retries: 0, timeout: 150_000 });
const harness = new GlHarness({ toolId: 'raptorHunt', toolFile: 'stem_lab/stem_tool_raptorhunt.js',
  width: 1100, height: 1000, layout: 'document', appStyles: true, extraScripts: ['node_modules/axe-core/axe.min.js'] });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));
async function mount(page: Page, acuity?: any) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { raptorHunt: { activeSection: 'acuity', acuity, xp: 0, visited: [] } }, undefined, { expectCanvas: false });
  await expect(page.locator('[data-raptor-angle-study]')).toBeVisible();
}
async function slider(page: Page, name: 'distance' | 'span' | 'opacity', value: number) {
  await page.locator('#rh-angle-' + name).evaluate((element: HTMLInputElement, value) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(element, String(value));
    element.dispatchEvent(new Event('input', { bubbles: true })); element.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}
const radians = (span: number, distance: number) => 2 * Math.atan(span / 100 / (2 * distance));

test('actual edge rays, angular arc and perspective target agree with independent geometry at all extrema', async ({ page }) => {
  await mount(page, { zoom: 5.5 }); // Legacy magnification must not become a species threshold.
  const root = page.locator('[data-raptor-angle-study]');
  await expect(page.locator('#rh-angle-distance')).toHaveValue('12');
  for (const [distance, span] of [[12, 40], [5, 10], [5, 100], [60, 10], [60, 100], [20, 80]]) {
    await slider(page, 'distance', distance); await slider(page, 'span', span);
    const theta = radians(span, distance), degrees = theta * 180 / Math.PI;
    expect(Number(await root.getAttribute('data-angle-radians'))).toBeCloseTo(theta, 9);
    await expect(page.locator('[data-angle-reading]')).toHaveText(degrees.toFixed(3) + '°');
    const geometry = await page.locator('[data-angle-map] svg').evaluate(svg => {
      const rays = [...svg.querySelectorAll('[data-angle-ray]')].map(node => {
        const line = node as SVGLineElement;
        return { x1: line.x1.baseVal.value, y1: line.y1.baseVal.value, x2: line.x2.baseVal.value, y2: line.y2.baseVal.value };
      });
      const arc = svg.querySelector('[data-angle-arc]') as SVGPathElement;
      const a = arc.getPointAtLength(0), b = arc.getPointAtLength(arc.getTotalLength());
      const span = svg.querySelector('[data-angle-span]') as SVGLineElement;
      return { rays, arc: { a: { x: a.x, y: a.y }, b: { x: b.x, y: b.y }, length: arc.getTotalLength() }, span: { y1: span.y1.baseVal.value, y2: span.y2.baseVal.value } };
    });
    const [left, right] = geometry.rays;
    const angleBetween = Math.atan2(right.y2 - right.y1, right.x2 - right.x1) - Math.atan2(left.y2 - left.y1, left.x2 - left.x1);
    expect(angleBetween).toBeCloseTo(theta, 6);
    expect((geometry.span.y2 - geometry.span.y1) / (right.x2 - right.x1)).toBeCloseTo(span / 100 / distance, 6);
    for (const point of [geometry.arc.a, geometry.arc.b]) expect(Math.hypot(point.x - 80, point.y - 150)).toBeCloseTo(175, 3);
    const arcAngle = Math.atan2(geometry.arc.b.y - 150, geometry.arc.b.x - 80) - Math.atan2(geometry.arc.a.y - 150, geometry.arc.a.x - 80);
    expect(arcAngle).toBeCloseTo(theta, 5);
    expect(geometry.arc.length / 175).toBeCloseTo(theta, 5);
    const expectedWidth = 640 * (span / 100) / (2 * distance * Math.tan(10 * Math.PI / 180));
    const displayed = await page.locator('[data-angle-target="current"]').evaluate((node: SVGGElement) => {
      const transform = node.transform.baseVal.consolidate()!.matrix;
      return { scaleX: transform.a, scaleY: transform.d, centerX: transform.e, centerY: transform.f, opacity: Number(node.getAttribute('opacity')), shape: node.innerHTML };
    });
    // Chromium exposes SVGTransform matrix components at single precision.
    // Bound the propagated width error by one relative Float32 unit (under
    // 0.000044 SVG pixels even at the largest target), rather than 5 decimals.
    expect(Math.abs(displayed.scaleX * 100 - expectedWidth)).toBeLessThanOrEqual(expectedWidth * 2 ** -23);
    expect(displayed.scaleY).toBeCloseTo(displayed.scaleX, 6);
    expect(displayed.centerX).toBe(320); expect(displayed.centerY).toBe(247);
    expect(displayed.shape).toContain('<path');
    await slider(page, 'opacity', 25);
    expect(Number(await page.locator('[data-angle-target="current"]').getAttribute('opacity'))).toBe(.25);
    expect(Number(await root.getAttribute('data-angle-radians'))).toBeCloseTo(theta, 9);
  }
  await expect(root).toContainText('not a calibrated acuity test');
  await expect(root).not.toContainText('5.5×');
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('pinned scenes freeze all conditions and single-factor experiments retain exact angular relationships', async ({ page }) => {
  await mount(page);
  await page.locator('[data-angle-preset="meadow"]').click(); await page.locator('[data-angle-pin]').click();
  const reference = await page.locator('[data-angle-view="pinned"]').innerHTML();
  const pinnedAngle = radians(40, 12);
  for (const [kind, distance, span] of [['distance', 24, 40], ['size', 12, 80], ['both', 24, 80]] as const) {
    await page.locator('[data-angle-experiment="' + kind + '"]').click();
    await expect(page.locator('#rh-angle-distance')).toHaveValue(String(distance)); await expect(page.locator('#rh-angle-span')).toHaveValue(String(span));
    await expect(page.locator('[data-angle-ratio]')).toHaveText((radians(span, distance) / pinnedAngle).toFixed(3) + '×');
    expect(await page.locator('[data-angle-view="pinned"]').innerHTML()).toBe(reference);
    if (kind === 'both') {
      expect(await page.locator('[data-angle-target="current"]').getAttribute('transform')).toBe(await page.locator('[data-angle-target="pinned"]').getAttribute('transform'));
      await expect(page.locator('[data-angle-ratio]')).toHaveText('1.000×');
    }
  }
  await slider(page, 'opacity', 10); await page.locator('[data-angle-shape="plaque"]').click();
  expect(await page.locator('[data-angle-view="pinned"]').innerHTML()).toBe(reference);
  await page.locator('[data-angle-experiment="distance"]').click();
  await expect(page.locator('#rh-angle-opacity')).toHaveValue('85'); await expect(page.locator('[data-angle-shape="vole"]')).toHaveAttribute('aria-pressed', 'true');
  await slider(page, 'distance', 31); await slider(page, 'span', 51); await page.locator('[data-angle-pin]').click();
  for (const kind of ['distance', 'size', 'both']) await expect(page.locator('[data-angle-experiment="' + kind + '"]')).toBeDisabled();
  await page.locator('[data-angle-clear-pin]').click(); await expect(page.locator('[data-angle-view="pinned"]')).toHaveCount(0);
  for (const answer of ['smaller', 'same', 'same']) {
    await page.locator('[data-angle-challenge]').click(); await page.locator('[data-angle-answer="' + answer + '"]').click();
    await expect(rootFeedback(page)).toContainText('Your prediction fits.');
  }
  await page.locator('[data-angle-challenge]').click(); await page.locator('[data-angle-answer="larger"]').click();
  await expect(rootFeedback(page)).toContainText('Check the span-to-distance ratio.');
  await page.locator('[data-angle-preset="calibration"]').click(); await expect(rootFeedback(page)).toHaveCount(0);
  await expect(page.locator('[data-angle-target="current"] rect')).toHaveCount(6);
  await page.locator('[data-angle-guides]').click(); await expect(page.locator('[data-angle-image-guides], [data-angle-centerline]')).toHaveCount(0);
  await expect(page.locator('[data-angle-ray]')).toHaveCount(2); await expect(page.locator('[data-angle-arc]')).toHaveCount(1);
});
function rootFeedback(page: Page) { return page.locator('.rh-angle-feedback[role="status"]'); }

test('controls remain static, keyboard reachable and accessible at desktop, phone and embedded widths', async ({ page }) => {
  await mount(page);
  const root = page.locator('[data-raptor-angle-study]');
  const before = await root.getAttribute('data-angle-radians');
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  expect(await root.getAttribute('data-angle-radians')).toBe(before);
  await page.locator('[data-angle-pin]').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('[data-angle-view="pinned"]')).toHaveCount(1);
  for (const layout of [{ viewport: 1280, host: 1100 }, { viewport: 390, host: 390 }, { viewport: 1280, host: 500 }]) {
    await page.setViewportSize({ width: layout.viewport, height: 1000 });
    await page.locator('#wrap').evaluate((element: HTMLElement, width) => { element.style.width = width + 'px'; element.style.maxWidth = '100%'; }, layout.host);
    await page.locator('#rh-angle-distance').focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight');
    await expect(page.locator('#rh-angle-distance')).toHaveValue('6'); await expect(page.locator('#rh-angle-distance')).toBeFocused();
    const host = (await page.locator('#wrap').boundingBox())!;
    for (const selector of ['[data-raptor-angle-study]', '[data-angle-map]', '.rh-angle-controls', '[data-angle-view="current"]', '[data-angle-view="pinned"]', '.rh-angle-compare', '.rh-angle-trial', '.rh-angle-evidence']) {
      const element = page.locator(selector), box = (await element.boundingBox())!;
      expect(box.x, selector).toBeGreaterThanOrEqual(host.x - 1); expect(box.x + box.width, selector).toBeLessThanOrEqual(host.x + host.width + 1);
      expect(await element.evaluate(node => node.scrollWidth - node.clientWidth), selector).toBeLessThanOrEqual(1);
    }
    expect(await page.evaluate(async () => {
      const report = await (window as any).axe.run(document.querySelector('[data-raptor-angle-study]'), { runOnly: { type: 'rule', values: ['color-contrast','button-name','select-name','label','aria-valid-attr-value','aria-required-children','aria-required-parent','nested-interactive'] } });
      return report.violations.map((item: any) => ({ id: item.id, targets: item.nodes.map((node: any) => node.target) }));
    })).toEqual([]);
  }
  await page.evaluate(() => (window as any).__ctx.setToolData((previous: any) => ({ ...previous, raptorHunt: { ...previous.raptorHunt, activeSection: 'hub' } })));
  await expect(root).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
