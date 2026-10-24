import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off' });
test.describe.configure({ retries: 0, timeout: 150_000 });
const harness = new GlHarness({ toolId: 'raptorHunt', toolFile: 'stem_lab/stem_tool_raptorhunt.js',
  width: 1100, height: 960, layout: 'document', appStyles: true, extraScripts: ['node_modules/axe-core/axe.min.js'] });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));
async function mount(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { raptorHunt: { activeSection: 'silent', xp: 0, visited: [] } }, undefined, { expectCanvas: false });
  await expect(page.locator('[data-raptor-feather-lab]')).toBeVisible();
}
async function setPhase(page: Page, value: number) {
  await page.locator('#rh-feather-phase').evaluate((element: HTMLInputElement, value) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(element, String(value));
    element.dispatchEvent(new Event('input', { bubbles: true })); element.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}

test('feather structures, plain reference and evidence remain synchronized without invented acoustics', async ({ page }) => {
  await mount(page);
  const root = page.locator('[data-raptor-feather-lab]'), study = page.locator('[data-feather-specimen="study"]');
  for (const [id, count, source, answer] of [
    ['comb', 21, '10.1177/1475472X17706131', 0], ['fringe', 34, '10.1186/1742-9994-4-23', 1], ['velvet', 56, '39670422', 0]
  ] as const) {
    await page.locator(`[data-feather-feature="${id}"]`).click();
    await expect(page.locator(`[data-feather-evidence="${id}"]`)).toBeVisible();
    await expect(root.locator(`a[href*="${source}"]`)).toBeVisible();
    await expect(study.locator(`[data-feather-structure="${id}"] path`)).toHaveCount(count);
    const structure = await study.locator(`[data-feather-structure="${id}"]`).evaluate(node => node.innerHTML);
    await page.locator(`[data-feather-toggle="${id}"]`).click();
    await expect(study.locator(`[data-feather-structure="${id}"]`)).toHaveCount(0);
    await expect(page.locator(`[data-feather-detail-structure="${id}"]`)).toHaveCount(0);
    await page.locator(`[data-feather-toggle="${id}"]`).click();
    expect(await study.locator(`[data-feather-structure="${id}"]`).evaluate(node => node.innerHTML)).toEqual(structure);
    await page.locator(`[data-feather-answer="${1 - answer}"]`).click();
    await expect(root.getByRole('status')).toContainText('Look at the type of evidence.');
    await page.locator(`[data-feather-answer="${answer}"]`).click();
    await expect(root.getByRole('status')).toContainText('That comparison fits.');
  }
  await expect(root.locator('[data-seen="true"]')).toHaveCount(3);
  await page.locator('[data-feather-compare]').click();
  await expect(page.locator('[data-feather-specimen="plain"]')).toBeVisible();
  await expect(page.locator('[data-feather-specimen="plain"] [data-feather-structure]')).toHaveCount(0);
  await expect(study.locator('[data-feather-structure]')).toHaveCount(3);
  // Inspect actual transformed surfaces, not just descriptive state attributes.
  await setPhase(page, 0);
  const contact = () => page.locator('[data-feather-contact]').evaluate((node: SVGGraphicsElement) => node.transform.baseVal.consolidate()!.matrix.e);
  expect(await contact()).toBeCloseTo(42, 3);
  await setPhase(page, 500); expect(await contact()).toBeCloseTo(147, 3);
  await setPhase(page, 1000); expect(await contact()).toBeCloseTo(42, 3);
  await page.locator('[data-feather-feature="comb"]').click();
  await expect(root.getByRole('status')).toHaveCount(0);
  await setPhase(page, 0);
  const particle = () => page.locator('[data-feather-air-particle]').first().evaluate((node: SVGCircleElement) => ({ x: node.cx.baseVal.value, y: node.cy.baseVal.value }));
  expect(await particle()).toEqual({ x: 20, y: 54 });
  await setPhase(page, 500); expect(await particle()).toEqual({ x: 230, y: 46.5 });
  await expect(root).not.toContainText('16 kHz');
  await expect(root).toContainText('No decibels, flight speeds, or prey-hearing predictions');
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('illustration clock preserves pause, stops for inspection and releases on leaving the activity', async ({ page }) => {
  await page.addInitScript(() => {
    let now = 1000, id = 0;
    const frames = new Map<number, FrameRequestCallback>();
    requestAnimationFrame = callback => { frames.set(++id, callback); return id; };
    cancelAnimationFrame = handle => { frames.delete(handle); };
    (window as any).featherStep = (ms: number) => { now += ms; const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback(now)); };
    (window as any).featherPending = () => frames.size;
  });
  await mount(page);
  const root = page.locator('[data-raptor-feather-lab]');
  const step = (ms: number) => page.evaluate(ms => (window as any).featherStep(ms), ms);
  const geometry = () => page.locator('[data-feather-closeup]').evaluate(node => node.innerHTML);
  await expect(root).toHaveAttribute('data-playing', 'false');
  const initial = await geometry(); await step(5000); expect(await geometry()).toEqual(initial);
  await page.locator('[data-feather-play]').click(); await step(10); await step(80);
  await expect(root).toHaveAttribute('data-phase', '330.000'); expect(await geometry()).not.toEqual(initial);
  await page.locator('[data-feather-play]').click(); const paused = await geometry(); await step(5000);
  expect(await geometry()).toEqual(paused);
  await page.locator('[data-feather-play]').click(); await step(10); await step(80);
  await expect(root).toHaveAttribute('data-phase', '340.000');
  await page.locator('[data-feather-feature="velvet"]').click();
  await expect(root).toHaveAttribute('data-playing', 'false');
  await page.locator('[data-feather-play]').click(); await setPhase(page, 750);
  await expect(root).toHaveAttribute('data-playing', 'false'); await expect(root).toHaveAttribute('data-phase', '750.000');
  await page.locator('[data-feather-play]').click();
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(root).toHaveAttribute('data-playing', 'false');
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(root).toHaveAttribute('data-playing', 'false');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.locator('[data-feather-play]').click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(root).toHaveAttribute('data-playing', 'false');
  await page.locator('[data-feather-play]').click();
  await page.evaluate(() => (window as any).__ctx.setToolData((previous: any) => ({ ...previous, raptorHunt: { ...previous.raptorHunt, activeSection: 'hub' } })));
  await expect(root).toHaveCount(0); await step(10000);
  expect(await page.evaluate(() => (window as any).featherPending())).toBe(0);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('feather studio controls retain keyboard access and fit desktop, phone and embedded layouts', async ({ page }) => {
  await mount(page);
  for (const layout of [{ viewport: 1280, host: 1100 }, { viewport: 390, host: 390 }, { viewport: 1280, host: 500 }]) {
    await page.setViewportSize({ width: layout.viewport, height: 1000 });
    await page.locator('#wrap').evaluate((element: HTMLElement, width) => { element.style.width = width + 'px'; element.style.maxWidth = '100%'; }, layout.host);
    const feature = page.locator('[data-feather-feature="velvet"]');
    await feature.focus(); await page.keyboard.press('Enter'); await expect(feature).toBeFocused();
    const slider = page.locator('#rh-feather-phase');
    await slider.focus(); await page.keyboard.press('Home'); await page.keyboard.press('PageUp');
    await expect(slider).toBeFocused(); await expect(slider).toHaveValue('100');
    if (!(await page.locator('[data-feather-specimen="plain"]').count())) await page.locator('[data-feather-compare]').click();
    const host = (await page.locator('#wrap').boundingBox())!;
    for (const selector of ['[data-raptor-feather-lab]', '[data-feather-specimen="study"]', '[data-feather-specimen="plain"]', '[data-feather-closeup]', '.rh-feather-tabs', '#rh-feather-phase', '.rh-feather-evidence']) {
      const element = page.locator(selector), box = (await element.boundingBox())!;
      expect(box.x, selector).toBeGreaterThanOrEqual(host.x - 1); expect(box.x + box.width, selector).toBeLessThanOrEqual(host.x + host.width + 1);
      expect(await element.evaluate(node => node.scrollWidth - node.clientWidth), selector).toBeLessThanOrEqual(1);
    }
    const violations = await page.evaluate(async () => {
      const report = await (window as any).axe.run(document.querySelector('[data-raptor-feather-lab]'), { runOnly: { type: 'rule', values: ['color-contrast','button-name','select-name','label','aria-valid-attr-value','aria-required-children','aria-required-parent','nested-interactive'] } });
      return report.violations.map((item: any) => ({ id: item.id, targets: item.nodes.map((node: any) => node.target) }));
    });
    expect(violations).toEqual([]);
  }
});
