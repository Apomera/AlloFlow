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
  await page.locator('#wrap').evaluate((element: HTMLElement, width) => {
    element.style.width = width + 'px'; element.style.maxWidth = '100%'; element.setAttribute('data-stem-tool-shell', 'true');
  }, host);
}
async function mount(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { birdLab: { view: 'physiology', blXp: 0, blLifeList: {}, blBadges: {} } }, undefined, { expectCanvas: false });
  await sizing(page, 1280, 1100);
  await expect(page.locator('[data-birdlab-breath-study]')).toBeVisible();
}
async function geometry(page: Page) {
  return page.locator('[data-birdlab-breath-study]').evaluate(element => {
    const map = element.querySelector('[data-breath-map]') as SVGSVGElement;
    const transform = (node: SVGGraphicsElement) => map.getCTM()!.inverse().multiply(node.getCTM()!);
    const point = new DOMPoint(0, 0).matrixTransform(transform(element.querySelector('[data-breath-packet]') as SVGGraphicsElement));
    const lung = element.querySelector('[data-breath-lung]') as SVGGraphicsElement;
    const bbox = lung.getBBox();
    return { phase: Number((element as HTMLElement).dataset.breathPhase), packet: [point.x, point.y],
      sacs: [...element.querySelectorAll('[data-breath-sac]')].map(node => transform(node as SVGGraphicsElement).a),
      lung: [bbox.x, bbox.y, bbox.width, bbox.height, lung.innerHTML],
      routes: [...element.querySelectorAll('[data-breath-route]')].map(node => {
        const route = node as SVGPathElement, length = route.getTotalLength();
        const a = route.getPointAtLength(0), b = route.getPointAtLength(length);
        return { start: [a.x, a.y], end: [b.x, b.y], d: route.getAttribute('d'), stroke: route.getAttribute('stroke') };
      }),
      lungArrow: element.querySelector('[data-breath-lung-arrow]')?.getAttribute('d'),
      tracheaArrow: element.querySelector('[data-breath-trachea-arrow]')?.getAttribute('d') };
  });
}
async function seek(page: Page, value: number) {
  await page.locator('#birdlab-breath-phase').fill(String(value));
  await expect(page.locator('[data-birdlab-breath-study]')).toHaveAttribute('data-breath-phase', value.toFixed(3));
}
async function progress(page: Page) {
  return page.evaluate(() => {
    const data = (window as any).__toolData.birdLab;
    return { xp: data.blXp, sightings: data.blLifeList, badges: data.blBadges };
  });
}

test('selected packet follows connected native paths while sacs change volume and the lung stays fixed', async ({ page }) => {
  await mount(page); const unchanged = await progress(page), initial = await geometry(page);
  const endpoints = [[654, 112], [220, 260], [342, 154], [478, 240], [654, 112]];
  // Continuity is checked on actual SVG geometry rather than phase labels.
  for (let i = 0; i < 4; i++) {
    expect(initial.routes[i].start).toEqual(endpoints[i]); expect(initial.routes[i].end).toEqual(endpoints[i + 1]);
  }
  for (const phase of [0, 1000, 2000, 3000, 4000]) {
    await seek(page, phase); const g = await geometry(page);
    for (let axis = 0; axis < 2; axis++) expect(g.packet[axis]).toBeCloseTo(endpoints[phase / 1000][axis], 3);
    expect(g.lung).toEqual(initial.lung);
    for (const sac of g.sacs) expect(sac).toBeCloseTo(phase % 2000 === 1000 ? 1 : .78, 5);
    expect(g.lungArrow).toBe(initial.lungArrow);
  }
  const controls = [
    [[654, 112], [575, 112], [375, 340], [220, 260]],
    [[220, 260], [215, 202], [277, 154], [342, 154]],
    [[342, 154], [400, 154], [470, 178], [478, 240]],
    [[478, 240], [560, 260], [575, 124], [654, 112]]
  ];
  for (let i = 0; i < 4; i++) {
    await page.locator(`[data-breath-preset="${i}"]`).click(); const g = await geometry(page);
    for (let axis = 0; axis < 2; axis++) {
      const p = controls[i].map(point => point[axis]);
      expect(g.packet[axis]).toBeCloseTo((p[0] + 3 * p[1] + 3 * p[2] + p[3]) / 8, 3);
    }
    expect(g.lung).toEqual(initial.lung); expect(g.routes[i].stroke).toBe('#8ff1d3');
    expect(g.tracheaArrow === initial.tracheaArrow).toBe(i % 2 === 0);
    expect(g.lungArrow).toBe(initial.lungArrow);
  }
  await page.locator('[data-breath-focus="lung"]').click();
  await expect(page.locator('[data-breath-lung]')).toHaveAttribute('data-organ-highlight', 'true');
  await expect(page.locator('[data-breath-organ-note]')).toContainText('relatively rigid lung');
  const beforeGuides = await geometry(page);
  await page.locator('[data-breath-guides-toggle]').click();
  await expect(page.locator('[data-breath-guides]')).toHaveCount(0);
  expect((await geometry(page)).packet).toEqual(beforeGuides.packet);
  await page.locator('[data-breath-answer="fixed"]').click();
  await expect(page.locator('.birdlab-breath-feedback[role="status"]')).toContainText('Look again');
  await page.locator('[data-breath-answer="mixing"]').click();
  await expect(page.locator('.birdlab-breath-feedback[role="status"]')).toContainText('not a universal stopwatch');
  expect(await progress(page)).toEqual(unchanged);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('the single journey clock preserves pause and inspection, stops at the endpoint and cleans up on exit', async ({ page }) => {
  await mount(page);
  await page.evaluate(() => {
    let now = 1000, id = 0;
    const frames = new Map<number, FrameRequestCallback>();
    requestAnimationFrame = callback => { frames.set(++id, callback); return id; };
    cancelAnimationFrame = handle => { frames.delete(handle); };
    (window as any).breathStep = (ms: number) => { now += ms; const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback(now)); };
    (window as any).breathPending = () => frames.size;
  });
  const root = page.locator('[data-birdlab-breath-study]');
  const step = (ms: number) => page.evaluate(ms => (window as any).breathStep(ms), ms);
  await expect(root).toHaveAttribute('data-playing', 'false');
  const initial = await geometry(page); await step(5000); expect(await geometry(page)).toEqual(initial);
  await page.locator('[data-breath-play]').click(); await step(10); await step(80);
  await expect(root).toHaveAttribute('data-breath-phase', '520.000'); expect((await geometry(page)).packet).not.toEqual(initial.packet);
  await page.locator('[data-breath-play]').click(); const paused = await geometry(page); await step(5000);
  expect(await geometry(page)).toEqual(paused);
  await page.locator('[data-breath-play]').click(); await step(10); await step(80);
  await expect(root).toHaveAttribute('data-breath-phase', '540.000');
  await seek(page, 3990); await expect(root).toHaveAttribute('data-playing', 'false');
  await page.locator('[data-breath-play]').click(); await step(10); await step(80);
  await expect(root).toHaveAttribute('data-breath-phase', '4000.000'); await expect(root).toHaveAttribute('data-playing', 'false');
  await step(10000); await expect(root).toHaveAttribute('data-breath-phase', '4000.000');
  await page.locator('[data-breath-play]').click(); await expect(root).toHaveAttribute('data-breath-phase', '0.000');
  await page.locator('[data-breath-preset="2"]').click(); await expect(root).toHaveAttribute('data-playing', 'false');
  await expect(root).toHaveAttribute('data-breath-phase', '2500.000');
  await page.locator('[data-breath-play]').click();
  await page.locator('[data-breath-focus="lung"]').click(); await expect(root).toHaveAttribute('data-playing', 'false');
  await page.locator('[data-breath-play]').click();
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(root).toHaveAttribute('data-playing', 'false');
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(root).toHaveAttribute('data-playing', 'false');
  await page.emulateMedia({ reducedMotion: 'no-preference' }); await page.locator('[data-breath-play]').click();
  await page.emulateMedia({ reducedMotion: 'reduce' }); await expect(root).toHaveAttribute('data-playing', 'false');
  await page.locator('[data-breath-play]').click();
  // BirdLab owns the view in local state; use its real navigation so both local
  // state and persisted tool data change, instead of editing only the host data.
  await page.getByRole('button', { name: '← Menu', exact: true }).click();
  await expect(root).toHaveCount(0); await step(10000);
  expect(await page.evaluate(() => (window as any).breathPending())).toBe(0);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('breathing-study controls support keyboard inspection and fit desktop, phone and embedded layouts', async ({ page }) => {
  await mount(page); const slider = page.locator('#birdlab-breath-phase');
  for (const layout of [{ viewport: 1280, host: 1100 }, { viewport: 390, host: 390 }, { viewport: 1280, host: 500 }]) {
    await sizing(page, layout.viewport, layout.host);
    const preset = page.locator('[data-breath-preset="1"]');
    await preset.focus(); await page.keyboard.press('Enter'); await expect(preset).toBeFocused();
    await expect(slider).toHaveValue('1500');
    await slider.focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight');
    await expect(slider).toBeFocused(); await expect(slider).toHaveValue('10');
    await page.keyboard.press('End'); await expect(slider).toHaveValue('4000');
    await page.locator('[data-breath-answer="mixing"]').click();
    const host = (await page.locator('#wrap').boundingBox())!;
    for (const selector of ['[data-birdlab-breath-study]', '[data-breath-map]', '#birdlab-breath-phase', '.birdlab-breath-phases', '.birdlab-breath-evidence', '.birdlab-breath-panel']) {
      const element = page.locator(selector), box = (await element.boundingBox())!;
      expect(box.x, selector).toBeGreaterThanOrEqual(host.x - 1); expect(box.x + box.width, selector).toBeLessThanOrEqual(host.x + host.width + 1);
      expect(await element.evaluate(node => node.scrollWidth - node.clientWidth), selector).toBeLessThanOrEqual(1);
    }
    expect((await page.locator('[data-breath-map]').boundingBox())!.width).toBeGreaterThan(300);
    const violations = await page.evaluate(async () => {
      const report = await (window as any).axe.run(document.querySelector('[data-birdlab-breath-study]'), { runOnly: { type: 'rule', values: ['color-contrast','button-name','select-name','label','aria-valid-attr-value','aria-required-children','aria-required-parent','nested-interactive'] } });
      return report.violations.map((item: any) => ({ id: item.id, targets: item.nodes.map((node: any) => node.target) }));
    });
    expect(violations).toEqual([]);
  }
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
