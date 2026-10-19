import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off' });
test.describe.configure({ retries: 0, timeout: 120_000 });
const harness = new GlHarness({ toolId: 'raptorHunt', toolFile: 'stem_lab/stem_tool_raptorhunt.js',
  width: 1100, height: 960, layout: 'document', appStyles: true, extraScripts: ['node_modules/axe-core/axe.min.js'] });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));
async function mount(page: Page, spiral: Record<string, unknown> = {}) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { raptorHunt: { activeSection: 'spiral', spiral, xp: 0, visited: [] } }, undefined, { expectCanvas: false });
}
async function setRange(page: Page, selector: string, value: number) {
  await page.locator(selector).evaluate((element: HTMLInputElement, value) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(element, String(value));
    element.dispatchEvent(new Event('input', { bubbles: true })); element.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}
async function geometry(page: Page) {
  return page.locator('[data-spiral-map]').evaluate(svg => {
    const path = svg.querySelector('[data-spiral-route]') as SVGPathElement;
    // Flush SVG layout after a React attribute update before native length reads.
    path.getBBox();
    const values = path.getAttribute('d')!.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
    const points = [];
    for (let index = 0; index < values.length; index += 2) points.push({ x: values[index], y: values[index + 1] });
    const bird = (svg.querySelector('[data-spiral-bird]') as SVGGraphicsElement).transform.baseVal.consolidate()!.matrix;
    const sight = svg.querySelector('[data-spiral-sightline]') as SVGLineElement;
    return { points, length: path.getTotalLength(), bird: { x: bird.e, y: bird.f, dx: bird.a, dy: bird.b }, target: { x: sight.x2.baseVal.value, y: sight.y2.baseVal.value } };
  });
}

test('the plotted curve and bird tangent maintain the chosen bearing and shared radial window', async ({ page }) => {
  await mount(page);
  for (const direction of ['Clockwise', 'Counterclockwise']) {
    await page.getByRole('button', { name: direction, exact: true }).click();
    for (const bearing of [0, 20, 40, 60, 70]) {
      await setRange(page, '#rh-spiral-bearing', bearing); await setRange(page, '#rh-spiral-progress', 600);
      // Native SVG length can still reflect the previous painted d after React
      // changes the attribute. Sample after the new curve has reached a frame.
      await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
      const frame = await geometry(page), radius = (p: { x: number; y: number }) => Math.hypot(p.x - frame.target.x, p.y - frame.target.y);
      expect(radius(frame.points[0])).toBeCloseTo(220, 3); expect(radius(frame.points.at(-1)!)).toBeCloseTo(22, 3);
      const angle = (x: number, y: number, dx: number, dy: number) => Math.acos(Math.max(-1, Math.min(1,
        (dx * (frame.target.x - x) + dy * (frame.target.y - y)) / (Math.hypot(dx, dy) * Math.hypot(frame.target.x - x, frame.target.y - y))))) * 180 / Math.PI;
      for (const index of [40, 80, 120, 160]) {
        const a = frame.points[index - 1], p = frame.points[index], b = frame.points[index + 1];
        expect(Math.abs(angle(p.x, p.y, b.x - a.x, b.y - a.y) - bearing)).toBeLessThan(.12);
        expect(radius(p)).toBeLessThan(radius(a));
      }
      expect(frame.bird.x).toBeCloseTo(frame.points[120].x, 3); expect(frame.bird.y).toBeCloseTo(frame.points[120].y, 3);
      expect(angle(frame.bird.x, frame.bird.y, frame.bird.dx, frame.bird.dy)).toBeCloseTo(bearing, 4);
      // Independent arc-length relationship for an equiangular path.
      expect(Math.abs(frame.length / 198 - 1 / Math.cos(bearing * Math.PI / 180)), direction + ' / ' + bearing + ' degrees / length ' + frame.length).toBeLessThan(.002);
      await expect(page.locator('[data-spiral-distance]')).toHaveText('46.0%');
    }
  }
  await page.getByRole('button', { name: 'Show angle fan', exact: true }).click();
  await expect(page.locator('[data-spiral-fan]')).toHaveCount(3);
  await setRange(page, '#rh-spiral-progress', 1000);
  await expect(page.locator('[data-spiral-distance]')).toHaveText('10.0%');
  await expect(page.locator('[data-raptor-spiral-study]')).not.toContainText('STRIKE');
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('one playback clock preserves pause and resume, stops at the finite endpoint, and releases on navigation', async ({ page }) => {
  await page.addInitScript(() => {
    let now = 1000, id = 0;
    const frames = new Map<number, FrameRequestCallback>();
    requestAnimationFrame = callback => { frames.set(++id, callback); return id; };
    cancelAnimationFrame = handle => { frames.delete(handle); };
    (window as any).spiralStep = (ms: number) => { now += ms; const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback(now)); };
    (window as any).spiralPending = () => frames.size;
  });
  await mount(page, { startAlt: 1500, headTilt: 65, playhead: 99, paused: false });
  const root = page.locator('[data-raptor-spiral-study]');
  const step = (ms: number) => page.evaluate(ms => (window as any).spiralStep(ms), ms);
  await expect(root).toHaveAttribute('data-playing', 'false'); await expect(root).toHaveAttribute('data-progress', '0');
  await step(5000); await expect(root).toHaveAttribute('data-progress', '0');
  await page.getByRole('button', { name: 'Play approach', exact: true }).click();
  await step(10); for (let i = 0; i < 10; i++) await step(80);
  const progress = Number(await root.getAttribute('data-progress'));
  expect(progress).toBeCloseTo(100, 6);
  await page.getByRole('button', { name: 'Pause approach', exact: true }).click();
  const frozen = await geometry(page); await step(30000); expect(await geometry(page)).toEqual(frozen);
  await page.getByRole('button', { name: 'Play approach', exact: true }).click();
  await step(10); await step(80); expect(Number(await root.getAttribute('data-progress'))).toBeCloseTo(progress + 10, 6);
  await setRange(page, '#rh-spiral-progress', 990); await expect(root).toHaveAttribute('data-playing', 'false');
  await page.getByRole('button', { name: 'Play approach', exact: true }).click(); await step(10); await step(80);
  await expect(root).toHaveAttribute('data-progress', '1000'); await expect(root).toHaveAttribute('data-playing', 'false');
  await page.getByRole('button', { name: 'Replay approach', exact: true }).click(); await step(10); await step(80);
  expect(Number(await root.getAttribute('data-progress'))).toBeCloseTo(10, 6);
  await page.evaluate(() => { const w = window as any; w.__toolData.raptorHunt.activeSection = 'hub'; w.__rerender(); });
  await expect(root).toHaveCount(0); await step(30000);
  expect(await page.evaluate(() => (window as any).spiralPending())).toBe(0);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('controls retain keyboard focus and fit accessible desktop, phone and embedded layouts', async ({ page }) => {
  await mount(page);
  for (const layout of [{ viewport: 1280, host: 1100 }, { viewport: 390, host: 390 }, { viewport: 1280, host: 500 }]) {
    await page.setViewportSize({ width: layout.viewport, height: 1000 });
    await page.locator('#wrap').evaluate((element: HTMLElement, width) => { element.style.width = width + 'px'; element.style.maxWidth = '100%'; }, layout.host);
    const slider = page.locator('#rh-spiral-progress');
    await slider.focus(); await page.keyboard.press('Home'); await page.keyboard.press('PageUp');
    await expect(slider).toBeFocused(); await expect(slider).toHaveValue('100');
    await page.locator('[data-spiral-bearing-preset="60"]').focus(); await page.keyboard.press('Enter');
    await expect(page.locator('[data-spiral-bearing-preset="60"]')).toBeFocused();
    const host = await page.locator('#wrap').boundingBox();
    for (const selector of ['[data-raptor-spiral-study]', '[data-spiral-map]', '.rh-spiral-controls', '#rh-spiral-progress']) {
      const element = page.locator(selector), box = (await element.boundingBox())!;
      expect(box.x, selector).toBeGreaterThanOrEqual(host!.x - 1); expect(box.x + box.width, selector).toBeLessThanOrEqual(host!.x + host!.width + 1);
      expect(await element.evaluate(node => node.scrollWidth - node.clientWidth), selector).toBeLessThanOrEqual(1);
    }
    const violations = await page.evaluate(async () => {
      const report = await (window as any).axe.run(document.querySelector('[data-raptor-spiral-study]'), { runOnly: { type: 'rule', values: ['color-contrast','button-name','select-name','label','aria-valid-attr-value','aria-required-children','aria-required-parent','nested-interactive'] } });
      return report.violations.map((item: any) => ({ id: item.id, targets: item.nodes.map((node: any) => node.target) }));
    });
    expect(violations).toEqual([]);
  }
});
