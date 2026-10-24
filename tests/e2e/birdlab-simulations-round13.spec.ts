import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off' });
test.describe.configure({ mode: 'default', retries: 0, timeout: 180_000 });
const harness = new GlHarness({ toolId: 'birdLab', toolFile: 'stem_lab/stem_tool_birdlab.js', preScripts: ['stem_lab/stem_lab_module.js'],
  extraScripts: ['node_modules/axe-core/axe.min.js'], width: 1100, height: 960, appStyles: true, layout: 'document' });

test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

type Model = { capacity: number; tau: number; travel: number; residence: number };
const initial: Model = { capacity: 80, tau: 20, travel: 8, residence: 20 };
const study = '[data-birdlab-forage-study]', current = '[data-forage-chart="current"]', frozen = '[data-forage-chart="pinned"]';

async function sizing(page: Page, viewport: number, host: number) {
  await page.setViewportSize({ width: viewport, height: 1000 });
  await page.locator('#wrap').evaluate((element: HTMLElement, width) => {
    element.style.width = width + 'px'; element.style.maxWidth = '100%'; element.setAttribute('data-stem-tool-shell', 'true');
  }, host);
}
async function mount(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { birdLab: { view: 'diets', blXp: 0, blLifeList: {}, blBadges: {} } }, undefined, { expectCanvas: false });
  await sizing(page, 1280, 1100);
  await expect(page.locator(study)).toBeVisible();
}
async function setModel(page: Page, model: Model) {
  for (const [key, value] of Object.entries(model)) await page.locator('#birdlab-forage-' + key).fill(String(value));
}
function collected(model: Model, time: number) { return model.capacity * (1 - Math.exp(-time / model.tau)); }
function rate(model: Model, time: number) { return collected(model, time) / (model.travel + time); }
// Independently maximize sampled average rates. The UI bisects an analytic
// derivative; this oracle does neither derivative evaluation nor root finding.
function gridPeak(model: Model) {
  let time = 0, maximum = 0;
  for (let index = 1; index <= 24_000; index++) {
    const candidate = index / 200, value = rate(model, candidate);
    if (value > maximum) { maximum = value; time = candidate; }
  }
  return { time, rate: maximum };
}
const chartX = (time: number) => 60 + (time + 90) / 210 * 640;
const chartY = (gain: number) => 270 - gain / 120 * 220;
function near(actual: number, expected: number) {
  // Chromium stores native SVGAnimatedLength values as Float32. Keep the
  // tolerance below one thousandth of a chart unit without requiring doubles.
  expect(Math.abs(actual - expected)).toBeLessThan(1e-4);
}
async function checkPaint(page: Page, model: Model) {
  const painted = await page.locator(current).evaluate(element => {
    const svg = element.querySelector('svg')!, path = svg.querySelector('[data-forage-curve]') as SVGPathElement;
    const values = path.getAttribute('d')!.match(/-?\d+(?:\.\d+)?/g)!.map(Number), points: number[][] = [];
    for (let index = 0; index < values.length; index += 2) points.push([values[index], values[index + 1]]);
    function line(selector: string) {
      const node = svg.querySelector(selector) as SVGLineElement;
      return [node.x1.baseVal.value, node.y1.baseVal.value, node.x2.baseVal.value, node.y2.baseVal.value];
    }
    function point(selector: string) { const node = svg.querySelector(selector) as SVGCircleElement; return [node.cx.baseVal.value, node.cy.baseVal.value]; }
    return { points, average: line('[data-forage-average]'), marginal: line('[data-forage-marginal]'),
      origin: point('[data-forage-origin]'), selected: point('[data-forage-point]'), length: path.getTotalLength(),
      onStroke: points.filter((_, index) => index % 40 === 0).every(value => path.isPointInStroke(new DOMPoint(value[0], value[1]))) };
  });
  expect(painted.points).toHaveLength(241); expect(painted.onStroke).toBe(true); expect(painted.length).toBeGreaterThan(365);
  for (let index = 0; index < painted.points.length; index++) {
    expect(Math.abs(painted.points[index][0] - chartX(index / 2))).toBeLessThan(.00051);
    expect(Math.abs(painted.points[index][1] - chartY(collected(model, index / 2)))).toBeLessThan(.00051);
  }
  const gain = collected(model, model.residence), mean = gain / (model.travel + model.residence);
  const marginal = model.capacity / model.tau * Math.exp(-model.residence / model.tau);
  const left = Math.max(-90, model.residence - 18), right = Math.min(120, model.residence + 18);
  [chartX(-model.travel), chartY(0), chartX(model.residence), chartY(gain)].forEach((value, index) => near(painted.average[index], value));
  [chartX(left), chartY(gain + marginal * (left - model.residence)), chartX(right), chartY(gain + marginal * (right - model.residence))].forEach((value, index) => near(painted.marginal[index], value));
  [chartX(-model.travel), chartY(0)].forEach((value, index) => near(painted.origin[index], value));
  [chartX(model.residence), chartY(gain)].forEach((value, index) => near(painted.selected[index], value));
  for (const [key, value] of Object.entries({ gain: gain.toFixed(2) + ' units', average: mean.toFixed(3) + ' units/s', marginal: marginal.toFixed(3) + ' units/s' })) {
    await expect(page.locator(current + ' [data-forage-reading="' + key + '"]')).toHaveText(value);
  }
  const geometry = await page.locator('[data-forage-scene]').evaluate(element => {
    function rect(selector: string) { const node = element.querySelector(selector) as SVGRectElement; return [node.x.baseVal.value, node.y.baseVal.value, node.width.baseVal.value, node.height.baseVal.value]; }
    return { travel: rect('[data-forage-time="travel"]'), feeding: rect('[data-forage-time="feeding"]'), collected: rect('[data-forage-collected]') };
  });
  [40, 166, model.travel / 210 * 660, 23].forEach((value, index) => near(geometry.travel[index], value));
  [40 + model.travel / 210 * 660, 166, model.residence / 210 * 660, 23].forEach((value, index) => near(geometry.feeding[index], value));
  [445, 88, 240 * gain / model.capacity, 18].forEach((value, index) => near(geometry.collected[index], value));
  const optimum = await page.locator(study).evaluate(element => ({ time: Number(element.getAttribute('data-forage-optimum-time')),
    rate: Number(element.getAttribute('data-forage-optimum-rate')), boundary: element.getAttribute('data-forage-optimum-boundary') === 'true' }));
  const independent = gridPeak(model);
  expect(Math.abs(optimum.time - independent.time)).toBeLessThan(.0051);
  expect(optimum.rate).toBeCloseTo(rate(model, optimum.time), 11); expect(optimum.rate).toBeGreaterThanOrEqual(independent.rate - 1e-11);
  const nextAtPeak = model.capacity / model.tau * Math.exp(-optimum.time / model.tau);
  if (optimum.boundary) { expect(optimum.time).toBe(120); expect(nextAtPeak).toBeGreaterThan(optimum.rate); }
  else expect(nextAtPeak).toBeCloseTo(optimum.rate, 10);
  return optimum;
}

test('native gain paths, time bars, secants and tangents agree with independent mathematics, including zero and the bounded optimum', async ({ page }) => {
  await mount(page); const progress = await page.evaluate(() => JSON.stringify((window as any).__toolData.birdLab));
  for (const model of [initial,
    { capacity: 20, tau: 5, travel: 1, residence: 0 },
    { capacity: 120, tau: 5, travel: 90, residence: 120 },
    { capacity: 120, tau: 120, travel: 1, residence: .25 },
    { capacity: 20, tau: 120, travel: 90, residence: 120 },
    { capacity: 60, tau: 35, travel: 45, residence: 65.75 },
    { capacity: 120, tau: 5, travel: 1, residence: 2.5 }]) {
    await setModel(page, model); const best = await checkPaint(page, model);
    await page.locator('[data-forage-peak-toggle]').click();
    const ring = await page.locator(current + ' [data-forage-peak]').evaluate((node: SVGCircleElement) => [node.cx.baseVal.value, node.cy.baseVal.value]);
    near(ring[0], chartX(best.time)); near(ring[1], chartY(collected(model, best.time)));
    await expect(page.locator('[data-forage-peak-note="current"]')).toContainText(best.boundary ? 'not a demonstrated global peak' : best.time.toFixed(2) + ' s');
    await page.locator('[data-forage-find]').click();
    const time = Number(await page.locator('#birdlab-forage-residence').inputValue());
    expect(Math.abs(time - best.time)).toBeLessThanOrEqual(.125 + 1e-12); expect(time * 4).toBe(Math.round(time * 4));
    await checkPaint(page, { ...model, residence: time });
  }
  await page.locator('[data-forage-answer="food"]').click(); await expect(page.locator('.birdlab-forage-feedback')).toContainText('Measure both travel time');
  await page.locator('[data-forage-answer="measure"]').click(); await expect(page.locator('.birdlab-forage-feedback')).toContainText('cannot establish which objective or constraint');
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.birdLab))).toBe(progress);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('a frozen condition survives current experiments, reset and host writes while range limits keep comparisons honest', async ({ page }) => {
  await mount(page); const pin = { capacity: 40, tau: 30, travel: 12, residence: 18.5 };
  await setModel(page, pin); await page.locator('[data-forage-peak-toggle]').click(); await page.locator('[data-forage-pin]').click();
  const frozenHTML = await page.locator(frozen).innerHTML(), originalPeak = gridPeak(pin).time;
  await page.locator('[data-forage-experiment="travel"]').click(); await checkPaint(page, { ...pin, travel: 24 });
  expect(Number(await page.locator(study).getAttribute('data-forage-optimum-time'))).toBeGreaterThan(originalPeak);
  await expect(page.locator('#birdlab-forage-residence')).toHaveValue('18.5'); await expect(page.locator('[data-forage-peak-toggle]')).toHaveAttribute('aria-pressed', 'false');
  await page.locator('[data-forage-experiment="capacity"]').click(); await checkPaint(page, { ...pin, capacity: 80 });
  await expect(page.locator('#birdlab-forage-travel')).toHaveValue('12');
  expect(Math.abs(Number(await page.locator(study).getAttribute('data-forage-optimum-time')) - originalPeak)).toBeLessThan(.0051);
  await page.locator('[data-forage-find]').click(); await page.locator('[data-forage-answer="leave"]').click();
  expect(await page.locator(frozen).innerHTML()).toBe(frozenHTML);
  const liveHTML = await page.locator(current).innerHTML();
  await page.evaluate(() => (window as any).__ctx.update('birdLab', 'blXp', 11));
  await expect.poll(() => page.evaluate(() => (window as any).__toolData.birdLab.blXp)).toBe(11);
  expect(await page.locator(current).innerHTML()).toBe(liveHTML); expect(await page.locator(frozen).innerHTML()).toBe(frozenHTML);
  await page.locator('[data-forage-reset]').click(); await checkPaint(page, initial);
  expect(await page.locator(frozen).innerHTML()).toBe(frozenHTML); await expect(page.locator('.birdlab-forage-feedback')).toHaveCount(0);
  await page.locator('#birdlab-forage-travel').fill('60'); await page.locator('#birdlab-forage-capacity').fill('80');
  await page.locator('[data-forage-pin]').click(); await expect(page.locator('[data-forage-experiment="travel"]')).toBeDisabled();
  await expect(page.locator('[data-forage-experiment="capacity"]')).toBeDisabled();
  const boundedHTML = await page.locator(current).innerHTML();
  await page.locator('[data-forage-experiment="travel"]').evaluate((element: HTMLButtonElement) => element.click());
  expect(await page.locator(current).innerHTML()).toBe(boundedHTML);
  for (const [key, maximum] of Object.entries({ capacity: 120, tau: 120, travel: 90, residence: 120 })) {
    const slider = page.locator('#birdlab-forage-' + key); await slider.focus(); await page.keyboard.press('End'); await page.keyboard.press('ArrowRight');
    await expect(slider).toHaveValue(String(maximum));
  }
  await checkPaint(page, { capacity: 120, tau: 120, travel: 90, residence: 120 }); await page.locator('[data-forage-find]').click();
  await expect(page.locator('[data-forage-peak-note="current"]')).toContainText('average is still rising');
  await page.locator('[data-forage-clear]').click(); await expect(page.locator(frozen)).toHaveCount(0); await expect(page.locator('[data-forage-comparison]')).toHaveCount(0);
  await expect(page.locator('.birdlab-forage-model')).toContainText('not measurements of a species');
  await expect(page.locator('.birdlab-forage-model')).toContainText('It predicts no real bird');
  expect(await page.evaluate(() => (window as any).__toolData.birdLab.blXp)).toBe(11);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('manual controls and paired charts remain keyboard usable, readable and contained in desktop, phone and embedded hosts', async ({ page }) => {
  await mount(page);
  for (const layout of [{ viewport: 1280, host: 1100 }, { viewport: 390, host: 390 }, { viewport: 1280, host: 500 }]) {
    await sizing(page, layout.viewport, layout.host);
    for (const [key, value] of Object.entries({ travel: '2', residence: '0.25', capacity: '30', tau: '6' })) {
      const slider = page.locator('#birdlab-forage-' + key); await slider.focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight');
      await expect(slider).toHaveValue(value); await expect(slider).toBeFocused();
    }
    const pin = page.locator('[data-forage-pin]'); await pin.focus(); await page.keyboard.press('Enter'); await expect(pin).toBeFocused();
    const reveal = page.locator('[data-forage-peak-toggle]'); await reveal.focus(); await page.keyboard.press('Enter'); await expect(reveal).toBeFocused();
    await expect(reveal).toHaveAttribute('aria-pressed', 'true');
    await page.locator('[data-forage-answer="measure"]').focus(); await page.keyboard.press('Enter'); await expect(page.locator('.birdlab-forage-feedback')).toContainText('Yes.');
    const host = (await page.locator('#wrap').boundingBox())!;
    for (const selector of [study, '[data-forage-scene]', current, frozen, '.birdlab-forage-controls', '[data-forage-comparison]', '.birdlab-forage-evidence', '.birdlab-forage-model']) {
      const node = page.locator(selector), box = (await node.boundingBox())!;
      expect(box.x, selector).toBeGreaterThanOrEqual(host.x - 1); expect(box.x + box.width, selector).toBeLessThanOrEqual(host.x + host.width + 1);
      expect(await node.evaluate(element => element.scrollWidth - element.clientWidth), selector).toBeLessThanOrEqual(1);
    }
    for (const selector of [current, frozen]) expect((await page.locator(selector).boundingBox())!.width, selector).toBeGreaterThan(280);
    const plots = await page.locator('.birdlab-forage-charts').evaluate(element => [...element.querySelectorAll('figure')].map(node => ({ top: node.getBoundingClientRect().top, left: node.getBoundingClientRect().left })));
    if (layout.host <= 500) { expect(plots[1].top).toBeGreaterThan(plots[0].top); expect(plots[1].left).toBeCloseTo(plots[0].left, 1); }
    else expect(plots[1].top).toBeCloseTo(plots[0].top, 1);
    const ticks = await page.locator(current + ' svg').evaluate(svg => {
      const native = svg as SVGSVGElement;
      return [...native.querySelectorAll('text')].map(node => { const box = node.getBBox(); return { text: node.textContent, x: box.x, right: box.x + box.width }; });
    });
    for (const tick of ticks) { expect(tick.x, tick.text || '').toBeGreaterThanOrEqual(0); expect(tick.right, tick.text || '').toBeLessThanOrEqual(740); }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    const violations = await page.evaluate(async () => {
      const report = await (window as any).axe.run(document.querySelector('[data-birdlab-forage-study]'), { runOnly: { type: 'rule', values: ['color-contrast', 'button-name', 'select-name', 'label', 'aria-valid-attr-value', 'aria-required-children', 'aria-required-parent', 'nested-interactive'] } });
      return report.violations.map((item: any) => ({ id: item.id, targets: item.nodes.map((node: any) => node.target) }));
    }); expect(violations).toEqual([]);
  }
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
