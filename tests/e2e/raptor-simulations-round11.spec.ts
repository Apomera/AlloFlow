import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off' });
test.describe.configure({ retries: 0, timeout: 150_000 });
const harness = new GlHarness({ toolId: 'raptorHunt', toolFile: 'stem_lab/stem_tool_raptorhunt.js',
  width: 1100, height: 1000, layout: 'document', appStyles: true, extraScripts: ['node_modules/axe-core/axe.min.js'] });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));
async function mount(page: Page, contactPressure?: any) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { raptorHunt: { activeSection: 'talons', contactPressure, xp: 0, visited: [] } }, undefined, { expectCanvas: false });
  await expect(page.locator('[data-raptor-contact-study]')).toBeVisible();
}
async function slider(page: Page, name: 'force' | 'area', value: number) {
  await page.locator('#rh-contact-' + name).evaluate((element: HTMLInputElement, value) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(element, String(value));
    element.dispatchEvent(new Event('input', { bubbles: true })); element.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}
const graphX = (area: number) => 70 + (area - 2) / 38 * 530;
const graphY = (pressure: number) => 235 - Math.log(pressure / .125) / Math.log(400) * 205;

test('native contact disks, mean pressure, unit conversion and full pressure curves agree at all input extrema', async ({ page }) => {
  await mount(page);
  const root = page.locator('[data-raptor-contact-study]');
  for (const [force, area] of [[40, 20], [5, 2], [5, 40], [100, 2], [100, 40], [73, 17]]) {
    await slider(page, 'force', force); await slider(page, 'area', area);
    const pressure = force / area;
    await expect(page.locator('[data-contact-reading]')).toHaveText(pressure.toFixed(3) + ' MPa');
    expect(Number(await root.getAttribute('data-pressure-mpa'))).toBeCloseTo(pressure, 10);
    await expect(page.locator('.rh-contact-reading')).toContainText((pressure * 1_000_000).toLocaleString('en-US') + ' Pa');
    let previousColor = '';
    for (const count of [1, 2, 4]) {
      await page.locator('[data-contact-count="' + count + '"]').click();
      const disks = await page.locator('[data-contact-disk="current"]').evaluateAll(nodes => nodes.map(node => {
        const circle = node as SVGCircleElement;
        return { radius: circle.r.baseVal.value, cx: circle.cx.baseVal.value, cy: circle.cy.baseVal.value, fill: circle.getAttribute('fill') };
      }));
      expect(disks).toHaveLength(count);
      // Read native SVG radii, rather than trusting the helper's area attributes.
      const renderedArea = disks.reduce((total, disk) => total + Math.PI * (disk.radius / 17) ** 2, 0);
      expect(renderedArea).toBeCloseTo(area, 4);
      expect(disks.every(disk => disk.cx - disk.radius > 40 && disk.cx + disk.radius < 600 && disk.cy - disk.radius > 25 && disk.cy + disk.radius < 335)).toBe(true);
      await expect(page.locator('[data-contact-per-patch]')).toHaveText((force / count).toFixed(2) + ' N ÷ ' + (area / count).toFixed(2) + ' mm²');
      await expect(page.locator('[data-contact-reading]')).toHaveText(pressure.toFixed(3) + ' MPa');
      const colors = [...new Set(disks.map(disk => disk.fill))];
      expect(colors).toHaveLength(1);
      if (previousColor) expect(colors[0]).toBe(previousColor); // Partition alone cannot change pressure.
      previousColor = colors[0]!;
    }
    const point = await page.locator('[data-contact-graph-point="current"]').evaluate((node: SVGCircleElement) => ({ x: node.cx.baseVal.value, y: node.cy.baseVal.value }));
    expect(point.x).toBeCloseTo(graphX(area), 4); expect(point.y).toBeCloseTo(graphY(pressure), 4);
    const curve = (await page.locator('[data-contact-curve="current"]').getAttribute('d'))!.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
    expect(curve).toHaveLength(306);
    for (let i = 0; i < 153; i++) {
      const sampledArea = 2 + i / 4;
      expect(curve[2 * i]).toBeCloseTo(graphX(sampledArea), 5);
      expect(curve[2 * i + 1]).toBeCloseTo(graphY(force / sampledArea), 5);
    }
  }
  await page.getByText('Read the force, area, and contact assumptions').click();
  await expect(root).toContainText('nonuniform pressure');
  await expect(root).toContainText('does not predict injuries');
  await expect(root).not.toContainText('CLEAN KILL');
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('pinned contacts stay frozen, controlled experiments preserve their inputs and predictions explain the ratios', async ({ page }) => {
  await mount(page);
  await page.locator('[data-contact-pin]').click();
  const reference = await page.locator('[data-contact-map="pinned"]').innerHTML();
  for (const [kind, force, area, ratio] of [['area', 40, 10, 2], ['force', 80, 20, 2], ['both', 80, 40, 1]] as const) {
    await page.locator('[data-contact-experiment="' + kind + '"]').click();
    await expect(page.locator('#rh-contact-force')).toHaveValue(String(force));
    await expect(page.locator('#rh-contact-area')).toHaveValue(String(area));
    await expect(page.locator('[data-contact-ratio]')).toHaveText(ratio.toFixed(3) + '×');
    expect(await page.locator('[data-contact-map="pinned"]').innerHTML()).toBe(reference);
    const pinPoint = await page.locator('[data-contact-graph-point="pinned"]').evaluate((node: SVGCircleElement) => ({ x: node.cx.baseVal.value, y: node.cy.baseVal.value }));
    expect(pinPoint.x).toBeCloseTo(graphX(20), 4); expect(pinPoint.y).toBeCloseTo(graphY(2), 4);
  }
  await page.locator('[data-contact-count="1"]').click(); await slider(page, 'area', 17);
  expect(await page.locator('[data-contact-map="pinned"]').innerHTML()).toBe(reference);
  await page.locator('[data-contact-pin]').click();
  await expect(page.locator('[data-contact-experiment="area"]')).toBeDisabled(); // No silent rounding of 17/2.
  await expect(page.locator('[data-contact-experiment="force"]')).toBeDisabled(); // 80*2 exceeds the input range.
  await page.locator('[data-contact-clear-pin]').click();
  await expect(page.locator('[data-contact-map="pinned"]')).toHaveCount(0);
  await expect(page.locator('[data-contact-curve="pinned"]')).toHaveCount(0);
  await expect(page.locator('[data-contact-graph-point="pinned"]')).toHaveCount(0);
  await page.locator('[data-contact-reset]').click();
  for (const answer of ['double', 'same', 'same']) {
    await page.locator('[data-contact-answer="half"]').click();
    await expect(page.locator('.rh-contact-feedback')).toContainText('Follow the force-to-area ratio.');
    await page.locator('[data-contact-answer="' + answer + '"]').click();
    await expect(page.locator('.rh-contact-feedback')).toContainText('Your prediction fits.');
    await page.locator('[data-contact-next]').click();
    await expect(page.locator('.rh-contact-feedback')).toHaveCount(0);
  }
  await expect(page.locator('[data-contact-question]')).toContainText('halve total contact area');
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('manual controls sanitize legacy inputs and stay keyboard accessible at desktop, phone and embedded widths', async ({ page }) => {
  await mount(page, { version: 1, force: -99, area: 0, count: 5 });
  const root = page.locator('[data-raptor-contact-study]');
  await expect(page.locator('#rh-contact-force')).toHaveValue('5'); await expect(page.locator('#rh-contact-area')).toHaveValue('2');
  await expect(page.locator('[data-contact-count="4"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-contact-reset]').click();
  const before = await root.innerHTML();
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  expect(await root.innerHTML()).toBe(before);
  await page.locator('[data-contact-pin]').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('[data-contact-map="pinned"]')).toHaveCount(1);
  for (const layout of [{ viewport: 1280, host: 1100 }, { viewport: 390, host: 390 }, { viewport: 1280, host: 500 }]) {
    await page.setViewportSize({ width: layout.viewport, height: 1000 });
    await page.locator('#wrap').evaluate((element: HTMLElement, width) => { element.style.width = width + 'px'; element.style.maxWidth = '100%'; }, layout.host);
    await page.locator('#rh-contact-force').focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight');
    await expect(page.locator('#rh-contact-force')).toHaveValue('6'); await expect(page.locator('#rh-contact-force')).toBeFocused();
    await page.locator('[data-contact-guides]').focus(); await page.keyboard.press('Enter');
    await expect(page.locator('[data-contact-grid="current"]')).toHaveCount(0);
    await page.keyboard.press('Enter'); await expect(page.locator('[data-contact-grid="current"]')).toHaveCount(1);
    const host = (await page.locator('#wrap').boundingBox())!;
    for (const selector of ['[data-raptor-contact-study]', '[data-contact-map="current"]', '.rh-contact-controls', '[data-contact-graph]', '.rh-contact-scale', '.rh-contact-comparison', '[data-contact-map="pinned"]', '[data-contact-map="comparison"]', '.rh-contact-trial', '.rh-contact-evidence']) {
      const element = page.locator(selector), box = (await element.boundingBox())!;
      expect(box.x, selector).toBeGreaterThanOrEqual(host.x - 1); expect(box.x + box.width, selector).toBeLessThanOrEqual(host.x + host.width + 1);
      expect(await element.evaluate(node => node.scrollWidth - node.clientWidth), selector).toBeLessThanOrEqual(1);
    }
    expect(await page.evaluate(async () => {
      const report = await (window as any).axe.run(document.querySelector('[data-raptor-contact-study]'), { runOnly: { type: 'rule', values: ['color-contrast','button-name','select-name','label','aria-valid-attr-value','aria-required-children','aria-required-parent','nested-interactive'] } });
      return report.violations.map((item: any) => ({ id: item.id, targets: item.nodes.map((node: any) => node.target) }));
    })).toEqual([]);
  }
  await page.evaluate(() => (window as any).__ctx.setToolData((previous: any) => ({ ...previous, raptorHunt: { ...previous.raptorHunt, activeSection: 'hub' } })));
  await expect(root).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
