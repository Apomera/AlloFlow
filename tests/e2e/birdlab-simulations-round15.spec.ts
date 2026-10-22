import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

test.use({ video: 'off' });
test.describe.configure({ mode: 'default', retries: 0, timeout: 180_000 });
const harness = new GlHarness({ toolId: 'birdLab', toolFile: 'stem_lab/stem_tool_birdlab.js', preScripts: ['stem_lab/stem_lab_module.js'],
  extraScripts: ['node_modules/axe-core/axe.min.js'], width: 1100, height: 960, appStyles: true, layout: 'document' });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
const fillEvidence: any[] = [];
const fillEvidencePath = resolve('reports/avian-simulations-round15-2026-10-20/season-fill-paint-evidence.json');
test.afterEach(async ({ page }) => {
  try {
    if (fillEvidence.length) {
      mkdirSync(dirname(fillEvidencePath), { recursive: true });
      const previous = existsSync(fillEvidencePath) ? JSON.parse(readFileSync(fillEvidencePath, 'utf8')) : [];
      writeFileSync(fillEvidencePath, JSON.stringify(previous.concat(fillEvidence), null, 2)); fillEvidence.length = 0;
    }
  } finally { await harness.destroy(page); }
});

type Model = { foodPeak: number; foodWidth: number; demandPeak: number; demandWidth: number };
const defaults: Model = { foodPeak: 54, foodWidth: 18, demandPeak: 64, demandWidth: 14 };
const root = '[data-birdlab-season-study]', chart = (key: string) => '[data-season-chart="' + key + '"]';
async function sizing(page: Page, viewport: number, host: number) {
  await page.setViewportSize({ width: viewport, height: 1000 });
  await page.locator('#wrap').evaluate((element: HTMLElement, width) => {
    element.style.width = width + 'px'; element.style.maxWidth = '100%'; element.setAttribute('data-stem-tool-shell', 'true');
  }, host);
}
async function mount(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { birdLab: { view: 'climateBirds', blXp: 0, blLifeList: {}, blBadges: {} } }, undefined, { expectCanvas: false });
  await sizing(page, 1280, 1100); await expect(page.locator(root)).toBeVisible();
}
async function settings(page: Page, model: Model) {
  for (const [key, value] of Object.entries(model)) await page.locator('#birdlab-season-' + key).fill(String(value));
}
// Evaluate the two linear triangle legs directly, rather than the runtime's
// absolute-value expression. Integration below samples independently of its
// crossing/breakpoint algorithm.
function triangle(time: number, peak: number, width: number) {
  if (time <= peak - width || time >= peak + width) return 0;
  return time <= peak ? (time - peak + width) / (width * width) : (peak + width - time) / (width * width);
}
function density(model: Model, time: number, kind: 'food' | 'demand') { return triangle(time, model[kind === 'food' ? 'foodPeak' : 'demandPeak'], model[kind === 'food' ? 'foodWidth' : 'demandWidth']); }
function quadrature(model: Model) {
  const step = 120 / 48_000; let sum = 0;
  for (let index = 0; index < 48_000; index++) { const time = (index + .5) * step; sum += Math.min(density(model, time, 'food'), density(model, time, 'demand')) * step; }
  return sum;
}
const x = (time: number) => 100 + time * 5;
const y = (value: number) => 260 - value * 1600;
function area(points: number[][]) {
  let twice = 0;
  for (let index = 0; index < points.length; index++) { const next = points[(index + 1) % points.length]; twice += points[index][0] * next[1] - next[0] * points[index][1]; }
  return Math.abs(twice) / 2 / 8000;
}
function near(actual: number, expected: number) {
  // Chromium native SVGAnimatedLength values are Float32, while the path's
  // serialized vertices retain their independently checked 0.001-unit grid.
  expect(Math.abs(actual - expected)).toBeLessThan(1e-4);
}

async function checkPaint(page: Page, model: Model, day: number, key = 'current') {
  const left = Math.max(model.foodPeak - model.foodWidth, model.demandPeak - model.demandWidth), right = Math.min(model.foodPeak + model.foodWidth, model.demandPeak + model.demandWidth);
  const mid = (left + right) / 2, minDensity = Math.min(density(model, mid, 'food'), density(model, mid, 'demand'));
  const painted = await page.locator(chart(key)).evaluate((element, probe) => {
    function points(path: SVGPathElement) { const values = path.getAttribute('d')!.match(/-?\d+(?:\.\d+)?/g)!.map(Number), result: number[][] = [];
      for (let index = 0; index < values.length; index += 2) result.push([values[index], values[index + 1]]); return result;
    }
    const shape = element.querySelector('[data-season-overlap-shape]') as SVGPathElement;
    const cursor = element.querySelector('[data-season-cursor]') as SVGLineElement, meter = element.querySelector('[data-season-meter]')!;
    function sampleFill() {
      const filled = shape.isPointInFill(new DOMPoint(probe.x, probe.y)), nativeLength = shape.getTotalLength(), css = getComputedStyle(shape);
      return { at: performance.now(), filled, nativeLength, attributeD: shape.getAttribute('d'), computedD: css.getPropertyValue('d'),
        transition: { property: css.transitionProperty, duration: css.transitionDuration, delay: css.transitionDelay, timing: css.transitionTimingFunction },
        animations: shape.getAnimations().map(animation => ({ playState: animation.playState, currentTime: animation.currentTime,
          transitionProperty: (animation as any).transitionProperty || null })) };
    }
    return { overlap: Number(element.getAttribute('data-season-overlap')), viewBox: element.querySelector('svg')!.getAttribute('viewBox'),
      curves: [...element.querySelectorAll('[data-season-profile]')].map(node => { const path = node as SVGPathElement, vertices = points(path), css = getComputedStyle(path);
        // A vertex may lie in a demand-curve dash gap. At offset zero, 3.5
        // units along the path is inside the first seven-unit painted dash.
        return { kind: path.getAttribute('data-season-profile'), vertices, length: path.getTotalLength(), stroke: css.stroke,
          dash: css.strokeDasharray, offset: parseFloat(css.strokeDashoffset), onStroke: path.isPointInStroke(path.getPointAtLength(3.5)) }; }),
      shape: points(shape), paint: sampleFill(),
      cursor: [cursor.x1.baseVal.value, cursor.y1.baseVal.value, cursor.x2.baseVal.value, cursor.y2.baseVal.value],
      samples: [...element.querySelectorAll('[data-season-sample]')].map(node => { const circle = node as SVGCircleElement;
        return { kind: circle.getAttribute('data-season-sample'), point: [circle.cx.baseVal.value, circle.cy.baseVal.value] }; }),
      meter: meter.getBoundingClientRect().width / meter.parentElement!.getBoundingClientRect().width
    };
  }, { x: left < right ? x(mid) : 200, y: left < right ? y(minDensity / 2) : 270 });
  const expected = quadrature(model);
  const probe = { x: left < right ? x(mid) : 200, y: left < right ? y(minDensity / 2) : 270 };
  const evidence: any = { test: test.info().title, key, model: { ...model }, day, probe, expectedFilled: expected > 0,
    expectedArea: expected, serializedArea: area(painted.shape), first: painted.paint, last: painted.paint, settled: null, samples: [painted.paint] };
  fillEvidence.push(evidence);
  expect(painted.viewBox).toBe('0 0 760 350'); expect(painted.overlap).toBeGreaterThanOrEqual(0); expect(painted.overlap).toBeLessThanOrEqual(1);
  expect(Math.abs(painted.overlap - expected)).toBeLessThan(2e-7); expect(Math.abs(area(painted.shape) - expected)).toBeLessThan(2e-5);
  // Presentation may settle after the d attribute changes. Keep the same
  // independently chosen fill probe and exact expected result; record what
  // the browser actually used rather than assuming a transition caused it.
  await expect.poll(async () => {
    const sample = await page.locator(chart(key)).evaluate((element, point) => {
      const path = element.querySelector('[data-season-overlap-shape]') as SVGPathElement;
      const filled = path.isPointInFill(new DOMPoint(point.x, point.y)), nativeLength = path.getTotalLength(), css = getComputedStyle(path);
      return { at: performance.now(), filled, nativeLength, attributeD: path.getAttribute('d'), computedD: css.getPropertyValue('d'),
        transition: { property: css.transitionProperty, duration: css.transitionDuration, delay: css.transitionDelay, timing: css.transitionTimingFunction },
        animations: path.getAnimations().map(animation => ({ playState: animation.playState, currentTime: animation.currentTime,
          transitionProperty: (animation as any).transitionProperty || null })) };
    }, probe);
    evidence.samples.push(sample); evidence.last = sample; return sample.filled;
  }, { timeout: 2000, intervals: [16, 32, 64, 128], message: 'native overlap fill must agree with the independent midpoint-density probe' }).toBe(expected > 0);
  evidence.settled = evidence.last;
  evidence.meter = { first: painted.meter, settled: null, samples: [] };
  await expect.poll(async () => {
    const sample = await page.locator(chart(key)).evaluate(element => {
      const meter = element.querySelector('[data-season-meter]')!, css = getComputedStyle(meter);
      return { at: performance.now(), fraction: meter.getBoundingClientRect().width / meter.parentElement!.getBoundingClientRect().width,
        width: css.width, transitionProperty: css.transitionProperty, transitionDuration: css.transitionDuration };
    });
    evidence.meter.samples.push(sample); evidence.meter.settled = sample;
    return Math.abs(sample.fraction - expected);
  }, { timeout: 2000, intervals: [16, 32, 64, 128], message: 'native meter width must agree with independent overlap after presentation settles' }).toBeLessThan(.0002);
  expect(painted.curves).toHaveLength(2);
  for (const curve of painted.curves) {
    const kind = curve.kind as 'food' | 'demand', peak = model[kind === 'food' ? 'foodPeak' : 'demandPeak'], width = model[kind === 'food' ? 'foodWidth' : 'demandWidth'];
    const expectedPoints = [[0, 0], [peak - width, 0], [peak, 1 / width], [peak + width, 0], [120, 0]];
    expect(curve.vertices).toHaveLength(5); expect(curve.onStroke).toBe(true); expect(curve.stroke).not.toBe('none'); expect(curve.length).toBeGreaterThan(600);
    expect((curve.dash.match(/-?\d+(?:\.\d+)?/g) || []).map(Number)).toEqual(kind === 'demand' ? [7, 4] : []); expect(curve.offset).toBe(0);
    for (let index = 0; index < expectedPoints.length; index++) {
      expect(Math.abs(curve.vertices[index][0] - x(expectedPoints[index][0]))).toBeLessThan(.00051);
      expect(Math.abs(curve.vertices[index][1] - y(expectedPoints[index][1]))).toBeLessThan(.00051);
    }
    expect(Math.abs(area(curve.vertices) - 1)).toBeLessThan(2e-5);
  }
  for (let index = 0; index < painted.shape.length; index++) {
    const time = (painted.shape[index][0] - 100) / 5, actualDensity = (260 - painted.shape[index][1]) / 1600;
    expect(Math.abs(actualDensity - Math.min(density(model, time, 'food'), density(model, time, 'demand')))).toBeLessThan(2.1e-6);
    if (index) expect(painted.shape[index][0]).toBeGreaterThanOrEqual(painted.shape[index - 1][0]);
  }
  for (const point of [model.foodPeak - model.foodWidth, model.foodPeak, model.foodPeak + model.foodWidth, model.demandPeak - model.demandWidth, model.demandPeak, model.demandPeak + model.demandWidth]) {
    expect(painted.shape.some(vertex => Math.abs(vertex[0] - x(point)) < .00051), 'every slope break is retained').toBe(true);
  }
  [x(day), 55, x(day), 260].forEach((value, index) => near(painted.cursor[index], value));
  for (const sample of painted.samples) { near(sample.point[0], x(day)); near(sample.point[1], y(density(model, day, sample.kind as 'food' | 'demand'))); }
  await expect(page.locator(chart(key) + ' [data-season-reading="overlap"]')).toHaveText(painted.overlap.toFixed(3));
  const lag = model.demandPeak - model.foodPeak;
  await expect(page.locator(chart(key) + ' [data-season-reading="lag"]')).toHaveText((lag > 0 ? '+' : '') + lag + ' d');
  for (const kind of ['food', 'demand'] as const) await expect(page.locator(chart(key) + ' [data-season-reading="' + kind + '"]')).toHaveText(density(model, day, kind).toFixed(5) + ' /d');
  return painted.overlap;
}

test('painted unit-area triangles, exact shared-area polygons and day markers agree with independent quadrature and polygon geometry', async ({ page }) => {
  await mount(page); const progress = await page.evaluate(() => JSON.stringify((window as any).__toolData.birdLab));
  const cases: { model: Model; day: number; index?: number }[] = [
    { model: defaults, day: 64 },
    { model: { foodPeak: 60, foodWidth: 20, demandPeak: 60, demandWidth: 20 }, day: 60, index: 1 },
    { model: { foodPeak: 30, foodWidth: 8, demandPeak: 90, demandWidth: 8 }, day: 0, index: 0 },
    { model: { foodPeak: 40, foodWidth: 10, demandPeak: 60, demandWidth: 10 }, day: 50, index: 0 },
    { model: { foodPeak: 60, foodWidth: 8, demandPeak: 60, demandWidth: 30 }, day: 54 },
    { model: { foodPeak: 60, foodWidth: 30, demandPeak: 60, demandWidth: 8 }, day: 90 },
    { model: { foodPeak: 57, foodWidth: 9, demandPeak: 64, demandWidth: 30 }, day: 57 },
    { model: { foodPeak: 64, foodWidth: 30, demandPeak: 57, demandWidth: 9 }, day: 64 },
    { model: { foodPeak: 30, foodWidth: 30, demandPeak: 90, demandWidth: 30 }, day: 120, index: 0 },
    { model: { foodPeak: 90, foodWidth: 30, demandPeak: 90, demandWidth: 30 }, day: 120, index: 1 },
    { model: { foodPeak: 30, foodWidth: 30, demandPeak: 30, demandWidth: 30 }, day: 0, index: 1 },
    { model: { foodPeak: 45, foodWidth: 29, demandPeak: 63, demandWidth: 27 }, day: 54 }
  ];
  const values: number[] = [];
  for (const item of cases) {
    await settings(page, item.model); await page.locator('#birdlab-season-day').fill(String(item.day));
    const value = await checkPaint(page, item.model, item.day); values.push(value); if (item.index !== undefined) expect(value).toBeCloseTo(item.index, 12);
  }
  expect(values[4]).toBeLessThan(1); expect(values[4]).toBeCloseTo(values[5], 12); expect(values[6]).toBeCloseTo(values[7], 12);
  await page.locator('[data-season-answer="yes"]').click(); await expect(page.locator('.birdlab-season-feedback')).toContainText('neither food delivered nor survival');
  await page.locator('[data-season-answer="measure"]').click(); await expect(page.locator('.birdlab-season-feedback')).toContainText('no food quantity, quality, feeding rate, or survival data');
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.birdLab))).toBe(progress);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('frozen timing remains physical, the cursor stays shared, and bounded single-factor actions preserve unrelated settings and host state', async ({ page }) => {
  await mount(page); await page.locator('[data-season-pin]').click();
  async function frozenGeometry() { return page.locator(chart('pinned')).evaluate(element => ({ attrs: [...element.attributes].map(attribute => [attribute.name, attribute.value]), paths: [...element.querySelectorAll('path')].map(path => path.getAttribute('d')) })); }
  const physical = await frozenGeometry();
  await page.locator('#birdlab-season-day').fill('54'); await checkPaint(page, defaults, 54, 'pinned');
  const frozenHTML = await page.locator(chart('pinned')).innerHTML();
  await page.locator('[data-season-experiment="food-earlier"]').click(); await checkPaint(page, { ...defaults, foodPeak: 44 }, 54);
  expect(await frozenGeometry()).toEqual(physical); expect(await page.locator(chart('pinned')).innerHTML()).toBe(frozenHTML);
  await page.locator('[data-season-experiment="demand-align"]').click(); await checkPaint(page, { ...defaults, demandPeak: 54 }, 54);
  await page.locator('[data-season-experiment="food-wider"]').click(); await checkPaint(page, { ...defaults, foodWidth: 23 }, 54);
  expect(await frozenGeometry()).toEqual(physical); await expect(page.locator('#birdlab-season-day')).toHaveValue('54');
  await page.locator('#birdlab-season-day').fill('22'); await checkPaint(page, defaults, 22, 'pinned');
  await checkPaint(page, { ...defaults, foodWidth: 23 }, 22); expect(await frozenGeometry()).toEqual(physical);
  await page.locator('[data-season-answer="measure"]').click(); await page.locator('[data-season-reset]').click();
  await checkPaint(page, defaults, 22); await expect(page.locator('#birdlab-season-day')).toHaveValue('22'); await expect(page.locator('.birdlab-season-feedback')).toHaveCount(0);
  const currentHTML = await page.locator(chart('current')).innerHTML(), pinHTML = await page.locator(chart('pinned')).innerHTML();
  const progress = await page.evaluate(() => JSON.stringify((window as any).__toolData.birdLab));
  await page.locator('[data-season-answer="lag"]').click(); expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.birdLab))).toBe(progress);
  await page.evaluate(() => (window as any).__ctx.update('birdLab', 'blXp', 19)); await expect.poll(() => page.evaluate(() => (window as any).__toolData.birdLab.blXp)).toBe(19);
  expect(await page.locator(chart('current')).innerHTML()).toBe(currentHTML); expect(await page.locator(chart('pinned')).innerHTML()).toBe(pinHTML);
  const limited = { foodPeak: 30, foodWidth: 30, demandPeak: 30, demandWidth: 8 };
  await settings(page, limited); await page.locator('[data-season-pin]').click();
  for (const action of ['food-earlier', 'demand-align', 'food-wider']) await expect(page.locator('[data-season-experiment="' + action + '"]')).toBeDisabled();
  const before = await page.locator(chart('current')).innerHTML();
  await page.locator('[data-season-experiment="food-earlier"]').evaluate((button: HTMLButtonElement) => button.click()); expect(await page.locator(chart('current')).innerHTML()).toBe(before);
  await checkPaint(page, limited, 22); await page.locator('[data-season-clear]').click(); await expect(page.locator(chart('pinned'))).toHaveCount(0); await expect(page.locator('[data-season-comparison]')).toHaveCount(0);
  await expect(page.locator('.birdlab-season-model')).toContainText('not species observations or calendar forecasts');
  await expect(page.locator('.birdlab-season-model')).toContainText('no temperature response');
  expect(await page.evaluate(() => (window as any).__toolData.birdLab.blXp)).toBe(19); expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('timing controls and shared-cursor comparisons remain keyboard usable and readable at desktop, phone and embedded host widths', async ({ page }) => {
  await mount(page);
  for (const layout of [{ viewport: 1280, host: 1100 }, { viewport: 390, host: 390 }, { viewport: 1280, host: 500 }]) {
    await sizing(page, layout.viewport, layout.host); await page.locator('[data-season-reset]').click();
    for (const key of ['foodPeak', 'demandPeak', 'foodWidth', 'demandWidth']) {
      const width = key.endsWith('Width'), slider = page.locator('#birdlab-season-' + key);
      await slider.focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowLeft'); await expect(slider).toHaveValue(width ? '8' : '30');
      await page.keyboard.press('ArrowRight'); await expect(slider).toHaveValue(width ? '9' : '31'); await expect(slider).toBeFocused();
      await page.keyboard.press('End'); await page.keyboard.press('ArrowRight'); await expect(slider).toHaveValue(width ? '30' : '90');
    }
    const cursor = page.locator('#birdlab-season-day'); await cursor.focus(); await page.keyboard.press('End'); await expect(cursor).toHaveValue('120');
    await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight'); await expect(cursor).toHaveValue('1'); await expect(cursor).toBeFocused();
    await settings(page, defaults);
    const pin = page.locator('[data-season-pin]'); await pin.focus(); await page.keyboard.press('Enter'); await expect(pin).toBeFocused();
    const change = page.locator('[data-season-experiment="food-earlier"]'); await change.focus(); await page.keyboard.press('Enter'); await expect(change).toBeFocused();
    await expect(page.locator('#birdlab-season-foodPeak')).toHaveValue('44'); await expect(cursor).toHaveValue('1');
    await page.locator('[data-season-answer="measure"]').focus(); await page.keyboard.press('Enter'); await expect(page.locator('.birdlab-season-feedback')).toContainText('Yes.');
    const host = (await page.locator('#wrap').boundingBox())!;
    for (const selector of [root, chart('current'), chart('pinned'), '.birdlab-season-controls', '.birdlab-season-cursor', '[data-season-comparison]', '.birdlab-season-evidence', '.birdlab-season-model']) {
      const node = page.locator(selector), box = (await node.boundingBox())!;
      expect(box.x, selector).toBeGreaterThanOrEqual(host.x - 1); expect(box.x + box.width, selector).toBeLessThanOrEqual(host.x + host.width + 1);
      expect(await node.evaluate(element => element.scrollWidth - element.clientWidth), selector).toBeLessThanOrEqual(1);
    }
    for (const key of ['current', 'pinned']) expect((await page.locator('[data-season-profiles="' + key + '"]').boundingBox())!.width, key).toBeGreaterThan(280);
    const columns = await page.locator('.birdlab-season-charts').evaluate(element => [...element.children].map(node => ({ top: node.getBoundingClientRect().top, left: node.getBoundingClientRect().left })));
    if (layout.host <= 500) { expect(columns[1].top).toBeGreaterThan(columns[0].top); expect(columns[1].left).toBeCloseTo(columns[0].left, 1); }
    else expect(columns[1].top).toBeCloseTo(columns[0].top, 1);
    const labels = await page.locator(root).evaluate(element => [...element.querySelectorAll('svg text')].map(node => { const text = node as SVGTextElement, bounds = text.getBBox();
      return { text: text.textContent, x: bounds.x, right: bounds.x + bounds.width, bottom: bounds.y + bounds.height, width: text.ownerSVGElement!.viewBox.baseVal.width, height: text.ownerSVGElement!.viewBox.baseVal.height };
    }));
    for (const label of labels) { expect(label.x, label.text || '').toBeGreaterThanOrEqual(0); expect(label.right, label.text || '').toBeLessThanOrEqual(label.width); expect(label.bottom, label.text || '').toBeLessThanOrEqual(label.height); }
    const violations = await page.evaluate(async () => {
      const result = await (window as any).axe.run(document.querySelector('[data-birdlab-season-study]'), { runOnly: { type: 'rule', values: ['color-contrast', 'button-name', 'select-name', 'label', 'aria-valid-attr-value', 'aria-required-children', 'aria-required-parent', 'nested-interactive'] } });
      return result.violations.map((item: any) => ({ id: item.id, nodes: item.nodes.map((node: any) => node.target) }));
    }); expect(violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  }
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
