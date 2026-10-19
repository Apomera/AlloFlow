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
  await harness.mount(page, { birdLab: { view: 'wingHunt', wingHunt: { v: 2, massG: 500, areaCm2: 1000, ar: 7, pick: null, log: [] }, blXp: 0, blLifeList: {}, blBadges: {} } }, undefined, { expectCanvas: false });
  await sizing(page, 1280, 1100);
  await expect(page.locator('[data-birdlab-lift-explorer]')).toBeVisible();
}
async function state(page: Page) {
  return page.locator('[data-birdlab-lift-explorer]').evaluate(element => {
    const data = (element as HTMLElement).dataset;
    const models = [...element.querySelectorAll('[data-lift-model]')].map(card => {
      const d = (card as HTMLElement).dataset, key = d.liftModel!;
      const line = (selector: string) => {
        const node = element.querySelector(selector)!;
        return ['x1', 'y1', 'x2', 'y2'].map(name => Number(node.getAttribute(name)));
      };
      const threshold = element.querySelector(`[data-lift-threshold-marker="${key}"]`)!;
      const marker = element.querySelector(`[data-lift-chart-marker="${key}"]`)!;
      return { key, mass: Number(d.liftMass), area: Number(d.liftArea), ar: Number(d.liftAr), lift: Number(d.liftForce), weight: Number(d.liftWeight),
        ratio: Number(d.liftRatio), threshold: Number(d.liftThreshold), scale: Number(d.liftForceScale),
        liftArrow: line(`[data-lift-vector="${key}"]`), weightArrow: line(`[data-weight-vector="${key}"]`),
        weightLine: line(`[data-lift-weight-line="${key}"]`), thresholdPoint: [Number(threshold.getAttribute('cx')), Number(threshold.getAttribute('cy'))],
        marker: key === 'current' ? [Number(marker.getAttribute('cx')), Number(marker.getAttribute('cy'))] : [Number(marker.getAttribute('x')) + 5, Number(marker.getAttribute('y')) + 5],
        curve: element.querySelector(`[data-lift-curve="${key}"]`)!.getAttribute('d')!.match(/-?\d+(?:\.\d+)?/g)!.map(Number) };
    });
    return { speed: Number(data.liftSpeed), maxSpeed: Number(data.liftPlotMaxSpeed), maxForce: Number(data.liftPlotMaxForce), models };
  });
}
async function verifyPhysicsAndDrawing(page: Page) {
  const drawing = await state(page);
  for (const model of drawing.models) {
    const weight = model.mass * 9.81, capacity = .5 * 1.225 * drawing.speed ** 2 * model.area * 1.6;
    const threshold = Math.sqrt(2 * weight / (1.225 * model.area * 1.6));
    expect(model.weight).toBeCloseTo(weight, 8); expect(model.lift).toBeCloseTo(capacity, 8); expect(model.threshold).toBeCloseTo(threshold, 8);
    expect(model.ratio).toBeCloseTo((drawing.speed / threshold) ** 2, 8);
    const up = model.liftArrow[1] - model.liftArrow[3], down = model.weightArrow[3] - model.weightArrow[1];
    expect(up).toBeCloseTo(capacity * model.scale, 6); expect(down).toBeCloseTo(weight * model.scale, 6);
    expect(up / down).toBeCloseTo(model.ratio, 7);
    const x = (speed: number) => 60 + speed / drawing.maxSpeed * 510, y = (force: number) => 235 - force / drawing.maxForce * 190;
    expect(model.marker[0]).toBeCloseTo(x(drawing.speed), 6); expect(model.marker[1]).toBeCloseTo(y(capacity), 6);
    expect(model.thresholdPoint[0]).toBeCloseTo(x(threshold), 6); expect(model.thresholdPoint[1]).toBeCloseTo(y(weight), 6);
    expect(model.weightLine[1]).toBeCloseTo(y(weight), 6); expect(model.weightLine[3]).toBeCloseTo(y(weight), 6);
    expect(model.curve).toHaveLength(162);
    for (const index of [0, 20, 40, 60, 80]) {
      const speed = drawing.maxSpeed * index / 80, lift = .5 * 1.225 * speed ** 2 * model.area * 1.6;
      expect(model.curve[index * 2]).toBeCloseTo(x(speed), 2); expect(model.curve[index * 2 + 1]).toBeCloseTo(y(lift), 2);
    }
  }
  if (drawing.models.length === 2) {
    expect(drawing.models[0].scale).toBe(drawing.models[1].scale);
    expect(drawing.models[0].marker[0]).toBeCloseTo(drawing.models[1].marker[0], 7);
  }
  return drawing;
}
async function progress(page: Page) {
  return page.evaluate(() => {
    const data = (window as any).__toolData.birdLab;
    return { xp: data.blXp, sightings: data.blLifeList, badges: data.blBadges, log: data.wingHunt.log };
  });
}

test('Lift Explorer force arrows and curves agree with independent lift arithmetic at zero and three threshold multiples', async ({ page }) => {
  await mount(page);
  const unchanged = await progress(page), slider = page.locator('#birdlab-lift-speed');
  await slider.press('Home');
  let current = await verifyPhysicsAndDrawing(page);
  expect(current.speed).toBe(0); expect(current.models[0].lift).toBe(0); expect(current.models[0].ratio).toBe(0);
  await expect(page.locator('[data-lift-reading="required-cl"]')).toContainText('No finite value');
  for (const factor of [.5, 1, 1.5]) {
    await page.locator(`[data-lift-speed-preset="${factor}"]`).click();
    current = await verifyPhysicsAndDrawing(page);
    expect(current.models[0].ratio).toBeCloseTo(factor ** 2, 8);
    expect(Number(await slider.inputValue())).toBeCloseTo(current.models[0].threshold * factor, 8);
  }
  await expect(page.locator('[data-lift-status="current"]')).toContainText('Extra capacity does not mean it must climb');
  expect(await progress(page)).toEqual(unchanged);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('a pinned wing design keeps its parameters at the same airspeed while mass, area and aspect ratio change only the current design', async ({ page }) => {
  await mount(page); await page.locator('[data-lift-speed-preset="1"]').click();
  await page.locator('[data-lift-pin]').click();
  const before = await verifyPhysicsAndDrawing(page), reference = before.models.find(model => model.key === 'pinned')!;
  const baselineSpeed = before.speed, unchanged = await progress(page);
  await page.locator('#wh-ar').press('End');
  let now = await verifyPhysicsAndDrawing(page), a = now.models.find(model => model.key === 'current')!, b = now.models.find(model => model.key === 'pinned')!;
  expect(a.ar).toBeGreaterThan(reference.ar); expect(a.threshold).toBe(reference.threshold); expect(a.lift).toBe(reference.lift); expect(a.weight).toBe(reference.weight);
  expect(b.ar).toBe(reference.ar); expect(now.speed).toBe(baselineSpeed);
  await page.locator('#wh-mass').press('ArrowRight');
  now = await verifyPhysicsAndDrawing(page); a = now.models.find(model => model.key === 'current')!; b = now.models.find(model => model.key === 'pinned')!;
  expect(a.mass).toBeGreaterThan(reference.mass); expect(a.lift).toBe(reference.lift); expect(a.threshold).toBeGreaterThan(reference.threshold);
  expect(a.ratio).toBeLessThan(reference.ratio); expect(now.speed).toBe(baselineSpeed);
  for (const key of ['mass', 'area', 'ar', 'lift', 'weight', 'ratio', 'threshold'] as const) expect(b[key]).toBe(reference[key]);
  await page.locator('#wh-area').press('ArrowRight');
  const moreArea = await verifyPhysicsAndDrawing(page), changed = moreArea.models.find(model => model.key === 'current')!;
  expect(changed.area).toBeGreaterThan(a.area); expect(changed.lift).toBeGreaterThan(a.lift); expect(changed.threshold).toBeLessThan(a.threshold);
  await page.locator('[data-lift-pin]').click();
  now = await verifyPhysicsAndDrawing(page); expect(now.models[0].mass).toBe(now.models[1].mass); expect(now.models[0].threshold).toBe(now.models[1].threshold);
  await page.getByRole('button', { name: 'Clear pinned design', exact: true }).click();
  await expect(page.locator('[data-lift-model]')).toHaveCount(1);
  expect(await progress(page)).toEqual(unchanged);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('Lift Explorer has coherent visual pause and accessible keyboard controls in desktop, phone and embedded layouts', async ({ page }) => {
  await mount(page); await page.locator('[data-lift-pin]').click();
  const motion = page.locator('[data-wl-motion-paused]'), toggle = page.locator('[data-wl-motion-toggle]');
  await expect(motion).toHaveAttribute('data-wl-motion-paused', 'true');
  const motionSnapshot = () => page.evaluate(() => [...document.querySelectorAll('.birdlab-wh-body,.birdlab-wh-wings,.birdlab-wh-thermal,.birdlab-wh-streaks,.birdlab-lift-flow')].map(element => {
    const css = getComputedStyle(element);
    return { transform: css.transform, opacity: css.opacity, dash: css.strokeDashoffset, state: css.animationPlayState };
  }));
  let still = await motionSnapshot(); expect(still.length).toBeGreaterThan(0);
  await page.waitForTimeout(150); expect(await motionSnapshot()).toEqual(still);
  await page.emulateMedia({ reducedMotion: 'no-preference' }); await toggle.click();
  await expect(motion).toHaveAttribute('data-wl-motion-paused', 'false');
  const moving = await motionSnapshot(); await page.waitForTimeout(180); expect(await motionSnapshot()).not.toEqual(moving);
  await toggle.click(); await expect(motion).toHaveAttribute('data-wl-motion-paused', 'true');
  still = await motionSnapshot(); await page.waitForTimeout(180); expect(await motionSnapshot()).toEqual(still);
  const slider = page.locator('#birdlab-lift-speed');
  for (const layout of [{ viewport: 1280, host: 1100 }, { viewport: 390, host: 390 }, { viewport: 1280, host: 500 }]) {
    await sizing(page, layout.viewport, layout.host);
    await slider.focus(); await page.keyboard.press('Home'); await expect(slider).toBeFocused(); expect((await state(page)).speed).toBe(0);
    await page.keyboard.press('ArrowRight'); await expect(slider).toBeFocused(); expect((await state(page)).speed).toBeGreaterThan(0);
    await page.keyboard.press('End'); const drawing = await verifyPhysicsAndDrawing(page); expect(drawing.speed).toBeCloseTo(drawing.maxSpeed, 8);
    const host = await page.locator('#wrap').boundingBox();
    for (const selector of ['[data-birdlab-lift-explorer]', '[data-lift-chart]', '#birdlab-lift-speed', '[data-lift-model="current"]', '[data-lift-model="pinned"]']) {
      const target = page.locator(selector), box = await target.boundingBox(), context = `${selector} at viewport${layout.viewport}/host${layout.host}`;
      expect(box!.x, context).toBeGreaterThanOrEqual(host!.x - 1); expect(box!.x + box!.width, context).toBeLessThanOrEqual(host!.x + host!.width + 1);
      expect(await target.evaluate(element => element.scrollWidth - element.clientWidth), context).toBeLessThanOrEqual(1);
    }
    const violations = await page.evaluate(async () => {
      const report = await (window as any).axe.run(document.querySelector('[data-birdlab-lift-explorer]'), { runOnly: { type: 'rule', values: ['color-contrast', 'button-name', 'select-name', 'label', 'aria-valid-attr-value', 'aria-required-children', 'aria-required-parent', 'nested-interactive'] } });
      return report.violations.map((item: any) => ({ id: item.id, targets: item.nodes.map((node: any) => node.target) }));
    });
    expect(violations).toEqual([]); await expect(motion).toHaveAttribute('data-wl-motion-paused', 'true');
  }
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
