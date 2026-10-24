import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off' });
test.describe.configure({ retries: 0, timeout: 150_000 });
const harness = new GlHarness({ toolId: 'raptorHunt', toolFile: 'stem_lab/stem_tool_raptorhunt.js',
  width: 1100, height: 1000, layout: 'document', appStyles: true, extraScripts: ['node_modules/axe-core/axe.min.js'] });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));
async function mount(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { raptorHunt: { activeSection: 'hearing', xp: 0, visited: [] } }, undefined, { expectCanvas: false });
  await expect(page.locator('[data-raptor-sound-study]')).toBeVisible();
}
async function slider(page: Page, name: 'bearing' | 'head' | 'phase', value: number) {
  await page.locator('#rh-sound-' + name).evaluate((element: HTMLInputElement, value) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(element, String(value));
    element.dispatchEvent(new Event('input', { bubbles: true })); element.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}
async function paths(page: Page) {
  return page.locator('[data-sound-path]').evaluateAll(nodes => nodes.map(node => {
    const line = node as SVGLineElement;
    return { x1: line.x1.baseVal.value, y1: line.y1.baseVal.value, x2: line.x2.baseVal.value, y2: line.y2.baseVal.value };
  }));
}

test('receiver geometry, pulse positions and frozen comparisons share the actual paths', async ({ page }) => {
  await mount(page);
  const root = page.locator('[data-raptor-sound-study]');
  let initial: any;
  for (const [bearing, turn] of [[40, 0], [-40, 0], [40, 40], [-90, 60], [90, -60], [0, 0]]) {
    await slider(page, 'bearing', bearing); await slider(page, 'head', turn);
    const actual = await paths(page), radians = Math.PI / 180;
    const source = { x: 320 + Math.sin(bearing * radians) * 220, y: 280 - Math.cos(bearing * radians) * 220 };
    const expected = [-1, 1].map(side => ({ x: 320 + side * 38 * Math.cos(turn * radians), y: 280 + side * 38 * Math.sin(turn * radians) }));
    for (let index = 0; index < 2; index++) {
      expect(actual[index].x1).toBeCloseTo(source.x, 3); expect(actual[index].y1).toBeCloseTo(source.y, 3);
      expect(actual[index].x2).toBeCloseTo(expected[index].x, 3); expect(actual[index].y2).toBeCloseTo(expected[index].y, 3);
    }
    const lengths = actual.map(p => Math.hypot(p.x2 - p.x1, p.y2 - p.y1));
    const bars = await page.locator('[data-arrival-timeline="current"] [data-arrival-bar]').evaluateAll(nodes => nodes.map(node => (node as SVGLineElement).x2.baseVal.value));
    lengths.forEach((distance, index) => expect((bars[index] - 96) / 1.4).toBeCloseTo(distance, 3));
    await slider(page, 'phase', 180);
    const particles = await page.locator('[data-sound-pulse]').evaluateAll(nodes => nodes.map(node => ({ x: (node as SVGCircleElement).cx.baseVal.value, y: (node as SVGCircleElement).cy.baseVal.value })));
    particles.forEach((particle, index) => {
      expect(particle.x).toBeCloseTo(source.x + (expected[index].x - source.x) * 180 / lengths[index], 3);
      expect(particle.y).toBeCloseTo(source.y + (expected[index].y - source.y) * 180 / lengths[index], 3);
    });
    expect(await page.locator('[data-sound-wave]').evaluate((node: SVGCircleElement) => node.r.baseVal.value)).toBe(180);
    await slider(page, 'phase', 280);
    await expect(page.locator('[data-sound-arrived][data-arrived="true"]')).toHaveCount(2);
    if (bearing === 40 && turn === 0) { await page.locator('[data-sound-pin]').click(); initial = await page.locator('[data-sound-pinned]').innerHTML(); }
    expect(await page.locator('[data-sound-pinned]').innerHTML()).toEqual(initial);
    if (bearing === turn) await expect(page.locator('[data-sound-cue]')).toHaveAttribute('data-sound-cue', 'equal');
  }
  await page.locator('[data-sound-preset="Source right"]').click();
  await expect(page.locator('[data-sound-cue]')).toHaveAttribute('data-sound-cue', 'right');
  await page.locator('[data-sound-preset="Source left"]').click();
  await expect(page.locator('[data-sound-cue]')).toHaveAttribute('data-sound-cue', 'left');
  await page.locator('[data-sound-guides]').click(); await expect(page.locator('[data-sound-path]')).toHaveCount(0);
  await expect(page.locator('[data-sound-wave]')).toHaveCount(1);
  await page.locator('[data-sound-guides]').click(); await expect(page.locator('[data-sound-path]')).toHaveCount(2);
  await page.locator('[data-sound-clear-pin]').click(); await expect(page.locator('[data-sound-pinned]')).toHaveCount(0);
  await expect(root).not.toContainText('Effective detection radius');
  await expect(root).toContainText('not a hearing test');
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('pulse clock pauses, finishes once and cleans up on visibility, motion preference and unmount', async ({ page }) => {
  await page.addInitScript(() => {
    let now = 1000, id = 0;
    const frames = new Map<number, FrameRequestCallback>();
    requestAnimationFrame = callback => { frames.set(++id, callback); return id; };
    cancelAnimationFrame = handle => { frames.delete(handle); };
    (window as any).soundStep = (ms: number) => { now += ms; const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback(now)); };
    (window as any).soundPending = () => frames.size;
  });
  await mount(page);
  const root = page.locator('[data-raptor-sound-study]'), play = page.locator('[data-sound-play]');
  const step = (ms: number) => page.evaluate(ms => (window as any).soundStep(ms), ms);
  await step(5000); await expect(root).toHaveAttribute('data-phase', '210.000');
  await play.click(); await step(10); await step(100); await expect(root).toHaveAttribute('data-phase', '216.400');
  await play.click(); await step(5000); await expect(root).toHaveAttribute('data-phase', '216.400');
  await play.click(); await slider(page, 'phase', 319); await expect(root).toHaveAttribute('data-playing', 'false');
  await play.click(); await step(10); await step(100);
  await expect(root).toHaveAttribute('data-phase', '320.000'); await expect(root).toHaveAttribute('data-playing', 'false');
  expect(await page.evaluate(() => (window as any).soundPending())).toBe(0);
  await play.click(); await expect(root).toHaveAttribute('data-phase', '0.000');
  await page.locator('[data-sound-preset="Straight ahead"]').click(); await expect(root).toHaveAttribute('data-playing', 'false');
  await play.click(); await slider(page, 'head', 15); await expect(root).toHaveAttribute('data-playing', 'false');
  await play.click(); await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(root).toHaveAttribute('data-playing', 'false');
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(root).toHaveAttribute('data-playing', 'false');
  await page.emulateMedia({ reducedMotion: 'no-preference' }); await play.click(); await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(root).toHaveAttribute('data-playing', 'false');
  await play.click(); await page.evaluate(() => (window as any).__ctx.setToolData((previous: any) => ({ ...previous, raptorHunt: { ...previous.raptorHunt, activeSection: 'hub' } })));
  await expect(root).toHaveCount(0); await step(10000);
  expect(await page.evaluate(() => (window as any).soundPending())).toBe(0);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('hidden trials conceal the source, reveal evidence and retain keyboard and responsive access', async ({ page }) => {
  await mount(page);
  const root = page.locator('[data-raptor-sound-study]');
  for (const expected of ['left', 'ahead', 'right']) {
    await page.locator('[data-sound-challenge]').click();
    await expect(root).toHaveAttribute('data-source-hidden', 'true');
    await expect(page.locator('[data-sound-source], [data-sound-path], [data-sound-wave], [data-sound-pulse]')).toHaveCount(0);
    await expect(page.locator('#rh-sound-bearing')).toHaveCount(0); await expect(page.locator('[data-sound-pin]')).toBeDisabled();
    await expect(page.locator('[data-sound-map]')).toHaveAttribute('aria-label', /Source concealed/);
    const answer = page.locator('[data-sound-answer="' + expected + '"]'); await answer.focus(); await page.keyboard.press('Enter');
    await expect(root.locator('.rh-sound-feedback[role="status"]')).toContainText('Your inference fits.'); await expect(page.locator('[data-sound-source]')).toHaveCount(1);
    await expect(root).toHaveAttribute('data-source-hidden', 'false');
  }
  await page.locator('[data-sound-challenge]').click(); await page.locator('[data-sound-answer="right"]').click();
  await expect(root.locator('.rh-sound-feedback[role="status"]')).toContainText('Compare the arrival order.');
  await page.locator('[data-sound-explore]').click(); await expect(root.locator('.rh-sound-feedback[role="status"]')).toHaveCount(0);
  await page.locator('[data-sound-pin]').click();
  for (const layout of [{ viewport: 1280, host: 1100 }, { viewport: 390, host: 390 }, { viewport: 1280, host: 500 }]) {
    await page.setViewportSize({ width: layout.viewport, height: 1000 });
    await page.locator('#wrap').evaluate((element: HTMLElement, width) => { element.style.width = width + 'px'; element.style.maxWidth = '100%'; }, layout.host);
    await page.locator('#rh-sound-head').focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight');
    await expect(page.locator('#rh-sound-head')).toHaveValue('-59'); await expect(page.locator('#rh-sound-head')).toBeFocused();
    const host = (await page.locator('#wrap').boundingBox())!;
    for (const selector of ['[data-raptor-sound-study]', '[data-sound-map]', '.rh-sound-controls', '.rh-sound-compare', '.rh-sound-trial', '.rh-sound-evidence', '#rh-sound-head']) {
      const element = page.locator(selector), box = (await element.boundingBox())!;
      expect(box.x, selector).toBeGreaterThanOrEqual(host.x - 1); expect(box.x + box.width, selector).toBeLessThanOrEqual(host.x + host.width + 1);
      expect(await element.evaluate(node => node.scrollWidth - node.clientWidth), selector).toBeLessThanOrEqual(1);
    }
    expect(await page.evaluate(async () => {
      const report = await (window as any).axe.run(document.querySelector('[data-raptor-sound-study]'), { runOnly: { type: 'rule', values: ['color-contrast','button-name','select-name','label','aria-valid-attr-value','aria-required-children','aria-required-parent','nested-interactive'] } });
      return report.violations.map((item: any) => ({ id: item.id, targets: item.nodes.map((node: any) => node.target) }));
    })).toEqual([]);
  }
});
