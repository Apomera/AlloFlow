import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 180_000, retries: 0 });
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_physics.js', toolId: 'physics', width: 1100, height: 900, layout: 'document', appStyles: true });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

async function mount(page: Page) {
  await page.addInitScript(() => {
    const w = window as any; let id = 0, now = 1000;
    const frames = new Map<number, FrameRequestCallback>();
    window.requestAnimationFrame = cb => { frames.set(++id, cb); return id; };
    window.cancelAnimationFrame = key => { frames.delete(key); };
    w.__comparisonTick = () => { now += 1000 / 60; const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(now)); };
  });
  await harness.mount(page, {}, undefined, { expectCanvas: false });
  await page.waitForFunction(() => !!(document.getElementById('physicsCanvas') as any)?._startModelComparison, null, { polling: 20 });
  await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; });
}
async function patch(page: Page, values: object) {
  await page.evaluate(p => (window as any).__ctx.setToolData((prev: any) => ({ ...prev, physics: { ...prev.physics, ...p } })), values);
  await page.waitForTimeout(40);
}
async function finish(page: Page) {
  await page.evaluate(() => {
    const w = window as any, cv = document.getElementById('physicsCanvas') as any; let frames = 0;
    while (cv._launched && frames++ < 10000) w.__comparisonTick();
    if (cv._launched) throw Error('Visual comparison fixture did not land');
  });
}
async function compare(page: Page, parameters = {}) {
  await patch(page, { angle: 35, velocity: 35, gravity: 9.8, mass: 2, launchHeight: 10, airResist: true, simSpeed: 2, ...parameters });
  await page.locator('[data-physics-model-comparison-start]').click();
  await finish(page);
  await page.waitForFunction(() => (document.getElementById('physicsCanvas') as any)._trails.length === 2, null, { polling: 20 });
  await finish(page);
  await page.waitForFunction(() => !!(window as any).__toolData.physics.modelComparison, null, { polling: 20 });
}
async function evidence(page: Page) {
  return page.evaluate(() => {
    const cv = document.getElementById('physicsCanvas') as any, d = (window as any).__toolData.physics;
    return { ball: cv._ball, trails: cv._trails.map((t: any) => ({ points: [...t], parameters: t.parameters, run: t.run, apex: t.apex, modelVersion: t.modelVersion })), log: d.runLog, lastFlight: d.lastFlight, comparison: d.modelComparison };
  });
}
async function assertBars(page: Page, comparison: any) {
  const bars = await page.locator('[data-physics-comparison-bar]').evaluateAll(elements => elements.map(el => {
    const bar = el as HTMLElement;
    return { key: bar.dataset.comparisonKey!, model: bar.dataset.physicsComparisonBar!, value: Number(bar.dataset.value), scale: Number(bar.dataset.scaleMax),
      width: bar.getBoundingClientRect().width, trackWidth: bar.parentElement!.getBoundingClientRect().width };
  }));
  expect(bars).toHaveLength(6);
  for (const bar of bars) {
    const value = comparison[bar.model][bar.key], scale = Math.max(comparison.vacuum[bar.key], comparison.drag[bar.key]);
    expect(bar.value).toBe(value); expect(bar.scale).toBe(scale);
    expect(Math.abs(bar.width - bar.trackWidth * (scale ? value / scale : 0))).toBeLessThan(.05);
    await expect(page.locator(`[data-physics-comparison-value="${bar.model}"][data-comparison-key="${bar.key}"]`)).toHaveText(value.toFixed(3) + (bar.key === 'time' ? ' s' : ' m'));
  }
}

test('visual comparison keeps captured measurements and opens the correct original flights', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await mount(page); await compare(page);
  const original = await evidence(page), pair = original.comparison;
  expect(pair.vacuum).toMatchObject({ run: 1, modelVersion: 'projectile-v3' });
  expect(pair.drag).toMatchObject({ run: 2, modelVersion: 'projectile-v3' });
  await patch(page, { angle: 80, velocity: 5, gravity: 1, mass: 9, launchHeight: 30 });
  await assertBars(page, pair);
  await expect(page.locator('[data-physics-model-comparison-settings]')).toContainText('35°, 35 m/s, g = 9.8 m/s², 2 kg');
  await expect(page.locator('[data-physics-comparison-relative="range"]')).toContainText('shorter with air drag');
  const summary = page.locator('[data-physics-comparison-exact] summary');
  await summary.focus(); await summary.press('Enter');
  await expect(page.locator('[data-physics-comparison-exact]')).toHaveAttribute('open', '');
  for (const key of ['range', 'maxH', 'time']) {
    expect(Number(await page.locator(`[data-physics-comparison-delta="${key}"]`).getAttribute('data-value'))).toBe(pair.drag[key] - pair.vacuum[key]);
    await expect(page.locator(`[data-comparison-measurement="${key}"]`)).toContainText(pair.vacuum[key].toFixed(3));
    await expect(page.locator(`[data-comparison-measurement="${key}"]`)).toContainText(pair.drag[key].toFixed(3));
  }
  for (const [model, run] of [['vacuum', 1], ['drag', 2]] as const) {
    await page.locator(`[data-physics-comparison-inspect="${model}"]`).click();
    await expect(page.locator('[data-physics-sample-slider]')).toBeFocused();
    const selected = await page.evaluate(() => (document.getElementById('physicsCanvas') as any)._inspection.snapshot);
    expect(selected).toMatchObject({ run, x: pair[model].range, t: pair[model].time, y: 0, parameters: { angle: 35, velocity: 35, launchHeight: 10, airResist: model === 'drag' } });
    await expect(page.locator('[data-physics-graph-flight]')).toHaveAttribute('data-physics-graph-flight', String(run));
    await expect(page.locator('[data-physics-flight-summary]')).toHaveAttribute('data-run', String(run));
    expect(await evidence(page)).toEqual(original);
  }
  await patch(page, { modelComparison: { ...pair, vacuum: { ...pair.vacuum, modelVersion: 'projectile-v2' } } });
  await expect(page.locator('[data-physics-comparison-inspect="vacuum"]')).toBeDisabled();
  await expect(page.locator('[data-physics-comparison-inspect="drag"]')).toBeEnabled();
  await patch(page, { modelComparison: { ...pair, drag: { ...pair.drag, range: pair.drag.range + 1 } } });
  await expect(page.locator('[data-physics-comparison-inspect="drag"]')).toBeDisabled();
  await expect(page.locator('[data-physics-comparison-inspect="vacuum"]')).toBeEnabled();
  expect(errors).toEqual([]);
});

test('horizontal elevated comparison shows equal maximum height and a longer falling time with drag', async ({ page }) => {
  await mount(page); await compare(page, { angle: 0, velocity: 30, launchHeight: 10, mass: 1 });
  const pair = (await evidence(page)).comparison;
  expect(pair.vacuum.maxH).toBe(10); expect(pair.drag.maxH).toBe(10);
  expect(pair.drag.time).toBeGreaterThan(pair.vacuum.time);
  await assertBars(page, pair);
  await expect(page.locator('[data-physics-comparison-relative="maxH"]')).toHaveText('Same recorded value');
  await expect(page.locator('[data-physics-comparison-relative="time"]')).toContainText('longer with air drag');
  await expect(page.locator('[data-physics-comparison-delta="time"]')).toContainText('+');
});

test('legacy summaries remain readable without invented samples or misleading zero and tiny differences', async ({ page }) => {
  await mount(page);
  const pair = { parameters: { angle: 5, velocity: 5, gravity: 9.8, mass: 1, launchHeight: 0 }, vacuum: { range: 0, maxH: 0, time: 1 }, drag: { range: 2, maxH: 0, time: 2 } };
  await patch(page, { modelComparison: pair });
  await assertBars(page, pair);
  await expect(page.locator('[data-physics-comparison-inspect]')).toHaveCount(2);
  for (const button of await page.locator('[data-physics-comparison-inspect]').all()) await expect(button).toBeDisabled();
  await expect(page.locator('[data-physics-comparison-relative="range"]')).toHaveText('Percentage unavailable for this baseline.');
  await expect(page.locator('[data-physics-comparison-relative="maxH"]')).toHaveText('Same recorded value');
  await expect(page.locator('[data-physics-model-comparison]')).not.toContainText('NaN');
  await expect(page.locator('[data-physics-model-comparison]')).not.toContainText('Infinity');
  await patch(page, { modelComparison: { ...pair, vacuum: { ...pair.vacuum, range: 1 }, drag: { ...pair.drag, range: .999999 } } });
  await expect(page.locator('[data-physics-comparison-delta="range"]')).toHaveText('<0.001 m shorter');
  await expect(page.locator('[data-physics-comparison-relative="range"]')).toHaveText('<0.1% shorter with air drag');
  expect(await page.evaluate(() => ((document.getElementById('physicsCanvas') as any)._trails || []).length)).toBe(0);
});

for (const theme of ['default', 'dark', 'contrast']) test(`320px ${theme} comparison supports keyboard inspection and scrolling exact measurements`, async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await mount(page);
  await page.evaluate(t => {
    const wrap = document.getElementById('wrap')!;
    const main = document.createElement('main'), card = document.createElement('div');
    wrap.parentElement!.insertBefore(main, wrap); main.append(card); card.append(wrap);
    main.className = 'main-content ' + (t === 'default' ? '' : 'theme-' + t); card.className = 'card';
    const ctx = (window as any).__ctx; ctx.isDark = t === 'dark'; ctx.isContrast = t === 'contrast'; ctx.theme = t;
    (window as any).__rerender();
  }, theme);
  await expect(page.locator('#physics-fs-outer')).toHaveAttribute('data-physics-theme', theme === 'default' ? 'light' : theme);
  await compare(page);
  const original = await evidence(page); await assertBars(page, original.comparison);
  const summary = page.locator('[data-physics-comparison-exact] summary');
  await summary.focus(); await summary.press('Enter');
  const region = page.getByRole('region', { name: 'Detailed comparison measurements; scroll for all columns', exact: true });
  await region.focus();
  expect(await region.evaluate(el => el.scrollWidth > el.clientWidth)).toBe(true);
  const before = await region.locator('tbody th').first().boundingBox();
  await region.evaluate(el => { el.scrollLeft = el.scrollWidth; });
  const after = await region.locator('tbody th').first().boundingBox();
  expect(after!.x).toBeCloseTo(before!.x, 1);
  const opener = page.locator('[data-physics-comparison-inspect="vacuum"]');
  await opener.focus(); await opener.press('Enter');
  await expect(page.locator('[data-physics-sample-slider]')).toBeFocused();
  expect(await evidence(page)).toEqual(original);
  const layout = await page.locator('[data-physics-model-comparison]').evaluate(root => ({
    overflow: document.documentElement.scrollWidth - innerWidth,
    buttons: [...root.querySelectorAll('button,summary')].map(el => el.getBoundingClientRect().height),
  }));
  expect(layout.overflow).toBeLessThanOrEqual(1);
  expect(layout.buttons.every(h => h >= 44)).toBe(true);
});
