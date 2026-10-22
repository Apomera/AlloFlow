import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off' });
test.describe.configure({ mode: 'default', retries: 0, timeout: 180_000 });
const harness = new GlHarness({ toolId: 'birdLab', toolFile: 'stem_lab/stem_tool_birdlab.js', preScripts: ['stem_lab/stem_lab_module.js'],
  extraScripts: ['node_modules/axe-core/axe.min.js'], width: 1100, height: 960, appStyles: true, layout: 'document' });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => { await harness.destroy(page); });

type Model = { count: number; radius: number; length: number; gradient: number };
const defaults: Model = { count: 4, radius: .5, length: 3, gradient: .6 };
const root = '[data-birdlab-shell-study]', condition = (key = 'current') => '[data-shell-condition="' + key + '"]';
async function sizing(page: Page, viewport: number, host: number) {
  await page.setViewportSize({ width: viewport, height: 1000 });
  await page.locator('#wrap').evaluate((element: HTMLElement, width) => {
    element.style.width = width + 'px'; element.style.maxWidth = '100%'; element.setAttribute('data-stem-tool-shell', 'true');
  }, host);
}
async function mount(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { birdLab: { view: 'reproDeep', blXp: 0, blLifeList: {}, blBadges: {} } }, undefined, { expectCanvas: false });
  await sizing(page, 1280, 1100); await expect(page.locator(root)).toBeVisible();
}
async function settings(page: Page, model: Model) { for (const [key, value] of Object.entries(model)) await page.locator('#birdlab-shell-' + key).fill(String(value)); }
function near(actual: number, expected: number, tolerance = 1e-4) { expect(Math.abs(actual - expected)).toBeLessThan(tolerance); }
// Independently integrate the vertical chord of a unit disk; the runtime uses
// pi*r*r. The resulting area is then combined with the slope of the native
// concentration line rather than copying its conductance expression.
const slices = 20_000;
let diskArea = 0;
for (let i = 0; i < slices; i++) { const x = -1 + (i + .5) * 2 / slices; diskArea += 2 * Math.sqrt(1 - x * x) * 2 / slices; }
function independent(model: Model) {
  const left = .5 + model.gradient / 2, right = .5 - model.gradient / 2;
  const area = diskArea * model.radius ** 2 * model.count;
  const slope = (right - left) / model.length, density = -slope;
  return { left, right, area, slope, density, conductance: area / model.length, rate: -slope * area };
}
async function physical(page: Page, key = 'current') {
  return page.locator(condition(key)).evaluate(element => ({
    settings: ['count', 'radius', 'length', 'gradient'].map(name => element.getAttribute('data-shell-' + name)),
    values: ['area', 'conductance', 'rate'].map(name => element.getAttribute('data-shell-' + name)),
    profile: element.querySelector('[data-shell-concentration-path]')!.getAttribute('d'),
    channel: ['x', 'y', 'width', 'height'].map(name => element.querySelector('[data-shell-channel]')!.getAttribute(name)),
    pores: [...element.querySelectorAll('[data-shell-pore]')].map(circle => ['cx', 'cy', 'r'].map(name => circle.getAttribute(name)))
  }));
}
async function checkNative(page: Page, model: Model, position = 1.5, key = 'current', other: Model | null = null) {
  const expected = independent(model), otherExpected = other ? independent(other) : expected;
  const scale = Math.max(expected.conductance, otherExpected.conductance), inside = position <= model.length;
  const painted = await page.locator(condition(key)).evaluate(element => {
    const path = element.querySelector('[data-shell-concentration-path]') as SVGPathElement;
    const numbers = path.getAttribute('d')!.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi)!.map(Number);
    const channel = element.querySelector('[data-shell-channel]') as SVGRectElement, cursor = element.querySelector('[data-shell-cursor]') as SVGLineElement;
    const sample = element.querySelector('[data-shell-sample]') as SVGCircleElement | null, poreCursor = element.querySelector('[data-shell-pore-cursor]') as SVGLineElement | null;
    const bar = element.querySelector('[data-shell-rate-bar]') as SVGRectElement;
    function line(node: SVGLineElement) { return [node.x1.baseVal.value, node.y1.baseVal.value, node.x2.baseVal.value, node.y2.baseVal.value]; }
    return { settings: Object.fromEntries(['count', 'radius', 'length', 'gradient'].map(name => [name, Number(element.getAttribute('data-shell-' + name))])),
      values: Object.fromEntries(['area', 'conductance', 'rate'].map(name => [name, Number(element.getAttribute('data-shell-' + name))])),
      views: [...element.querySelectorAll('svg')].map(svg => svg.getAttribute('viewBox')),
      channel: [channel.x.baseVal.value, channel.y.baseVal.value, channel.width.baseVal.value, channel.height.baseVal.value],
      pores: [...element.querySelectorAll('[data-shell-pore]')].map(node => { const circle = node as SVGCircleElement; return [circle.cx.baseVal.value, circle.cy.baseVal.value, circle.r.baseVal.value]; }),
      profile: [[numbers[0], numbers[1]], [numbers[2], numbers[3]]], cursor: line(cursor), sample: sample ? [sample.cx.baseVal.value, sample.cy.baseVal.value] : null,
      poreCursor: poreCursor ? line(poreCursor) : null, bar: [bar.x.baseVal.value, bar.y.baseVal.value, bar.width.baseVal.value, bar.height.baseVal.value],
      inside: element.querySelector('[data-shell-inspector]')!.getAttribute('data-shell-inside'), direction: element.querySelector('[data-shell-direction]')?.getAttribute('data-shell-direction') || null };
  });
  expect(painted.settings).toEqual(model); expect(painted.views).toEqual(['0 0 760 760', '0 0 760 350', '0 0 760 180']);
  near(painted.values.area, expected.area, 1e-5); near(painted.values.conductance, expected.conductance, 1e-5); near(painted.values.rate, expected.rate, 1e-5);
  const actualScale = Number(await page.locator(root).getAttribute('data-shell-scale')); near(actualScale, scale, 1e-5);
  [100, 170 - 70 * model.radius, 70 * model.length, 140 * model.radius].forEach((value, i) => near(painted.channel[i], value));
  expect(painted.pores).toHaveLength(model.count);
  for (let i = 0; i < model.count; i++) [130 + 160 * (i % 4), 430 + 160 * Math.floor(i / 4), 70 * model.radius].forEach((value, coordinate) => near(painted.pores[i][coordinate], value));
  // Channel path length and pore radius have the same distance scale.
  near(painted.channel[2] / model.length, painted.pores[0][2] / model.radius);
  const profile = [[100, 260 - 200 * expected.left], [100 + 100 * model.length, 260 - 200 * expected.right]];
  profile.forEach((point, i) => point.forEach((value, j) => near(painted.profile[i][j], value)));
  const nativeSlope = ((260 - painted.profile[1][1]) / 200 - (260 - painted.profile[0][1]) / 200) / ((painted.profile[1][0] - painted.profile[0][0]) / 100);
  near(nativeSlope, expected.slope, 1e-9); near(-nativeSlope * expected.area, painted.values.rate, 1e-5);
  [100 + 100 * position, 60, 100 + 100 * position, 260].forEach((value, i) => near(painted.cursor[i], value));
  expect(painted.inside).toBe(String(inside));
  const concentration = expected.left + expected.slope * position;
  if (inside) {
    expect(painted.sample).not.toBeNull(); [100 + 100 * position, 260 - 200 * concentration].forEach((value, i) => near(painted.sample![i], value));
    [100 + 70 * position, 170 - 70 * model.radius, 100 + 70 * position, 170 + 70 * model.radius].forEach((value, i) => near(painted.poreCursor![i], value));
    await expect(page.locator(condition(key) + ' [data-shell-reading="concentration"]')).toHaveText('c(x) = ' + concentration.toFixed(3) + ' amount/volume');
  } else { expect(painted.sample).toBeNull(); expect(painted.poreCursor).toBeNull(); await expect(page.locator(condition(key) + ' [data-shell-reading="concentration"]')).toContainText('Outside this pore'); }
  expect(painted.direction).toBe(model.gradient === 0 ? null : model.gradient > 0 ? 'right' : 'left');
  const width = 260 * Math.abs(expected.rate) / scale, left = expected.rate < 0 ? 390 - width : 390;
  [left, 78, width, 22].forEach((value, i) => near(painted.bar[i], value));
  await expect(page.locator(condition(key) + ' [data-shell-reading="area"]')).toHaveText(expected.area.toFixed(3));
  await expect(page.locator(condition(key) + ' [data-shell-reading="conductance"]')).toHaveText(expected.conductance.toFixed(3));
  await expect(page.locator(condition(key) + ' [data-shell-reading="rate"]')).toHaveText((expected.rate > 0 ? '+' : '') + expected.rate.toFixed(3));
  // Native geometry can briefly lag attributes under shared presentation CSS.
  // All probes retain their independent endpoint/width/radius expectations.
  await expect.poll(async () => page.locator(condition(key)).evaluate((element, input) => {
    const failures: string[] = [], path = element.querySelector('[data-shell-concentration-path]') as SVGPathElement;
    const length = path.getTotalLength(), a = path.getPointAtLength(0), b = path.getPointAtLength(length), midpoint = new DOMPoint((input.profile[0][0] + input.profile[1][0]) / 2, (input.profile[0][1] + input.profile[1][1]) / 2);
    if (Math.abs(a.x - input.profile[0][0]) > .001 || Math.abs(a.y - input.profile[0][1]) > .001 || Math.abs(b.x - input.profile[1][0]) > .001 || Math.abs(b.y - input.profile[1][1]) > .001) failures.push('native profile endpoints');
    if (Math.abs(length - Math.hypot(input.profile[1][0] - input.profile[0][0], input.profile[1][1] - input.profile[0][1])) > .001 || !path.isPointInStroke(midpoint) || getComputedStyle(path).stroke === 'none') failures.push('native profile paint');
    const channel = element.querySelector('[data-shell-channel]') as SVGRectElement, channelBox = channel.getBBox();
    if (Math.abs(channelBox.width - 70 * input.model.length) > .001 || Math.abs(channelBox.height - 140 * input.model.radius) > .001) failures.push('native channel geometry');
    [...element.querySelectorAll('[data-shell-pore]')].forEach((node, i) => { const circle = node as SVGCircleElement, point = circle.getPointAtLength(0);
      if (Math.abs(point.x - (130 + 160 * (i % 4) + 70 * input.model.radius)) > .001 || Math.abs(point.y - (430 + 160 * Math.floor(i / 4))) > .001) failures.push('native circle ' + i); });
    const rect = element.querySelector('[data-shell-rate-bar]') as SVGRectElement, bounds = rect.getBBox();
    if (Math.abs(bounds.width - input.width) > .001 || input.width > 0 && (Math.abs(bounds.x - input.left) > .001 || Math.abs(bounds.height - 22) > .001)) failures.push('native rate bar');
    return failures;
  }, { profile, model, width, left }), { timeout: 2000, intervals: [16, 32, 64, 128] }).toEqual([]);
  return expected;
}

test('native cylinders, concentration endpoints and signed rates agree with independent disk quadrature and spatial gradients', async ({ page }) => {
  await mount(page); const progress = await page.evaluate(() => JSON.stringify((window as any).__toolData.birdLab));
  const states: Model[] = [defaults, { ...defaults, radius: 1 }, { ...defaults, length: 6 }, { ...defaults, count: 8 },
    { ...defaults, gradient: -.6 }, { ...defaults, gradient: 0 }, { count: 1, radius: .25, length: 6, gradient: -1 },
    { count: 8, radius: 1, length: 1, gradient: 1 }, { count: 3, radius: .4, length: 2.25, gradient: -.3 }];
  for (const model of states) { await settings(page, model); await checkNative(page, model); }
  await settings(page, defaults);
  for (const position of [0, 3, 3.1, 6]) { await page.locator('#birdlab-shell-position').fill(String(position)); await checkNative(page, defaults, position); }
  await settings(page, { ...defaults, gradient: 0 }); await checkNative(page, { ...defaults, gradient: 0 }, 6);
  await expect(page.locator(condition() + ' [data-shell-direction]')).toHaveCount(0);
  await expect(page.locator(root)).toContainText('Zero net transfer does not mean molecules stop moving');
  await expect(page.locator('.birdlab-shell-model')).toContainText('D is fixed at 1 length²/time');
  await expect(page.locator('.birdlab-shell-model')).toContainText('arbitrary model units');
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.birdLab))).toBe(progress);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('pins preserve all physical conditions, controlled changes remain single-factor, and shared inspection and host writes do not reset the study', async ({ page }) => {
  await mount(page); const progress = await page.evaluate(() => JSON.stringify((window as any).__toolData.birdLab));
  const legacyHeadings = await page.locator('h2').allTextContents();
  await page.locator('[data-shell-pin]').click(); const frozen = await physical(page, 'pinned'), base = independent(defaults);
  for (const [kind, changed, multiplier] of [
    ['radius', { ...defaults, radius: 1 }, 4], ['length', { ...defaults, length: 6 }, .5], ['count', { ...defaults, count: 8 }, 2],
    ['reverse', { ...defaults, gradient: -.6 }, -1], ['equal', { ...defaults, gradient: 0 }, 0]
  ] as [string, Model, number][]) {
    await page.locator('[data-shell-experiment="' + kind + '"]').click();
    const result = await checkNative(page, changed, 1.5, 'current', defaults); await checkNative(page, defaults, 1.5, 'pinned', changed);
    near(result.rate, base.rate * multiplier, 1e-9); expect(await physical(page, 'pinned')).toEqual(frozen);
    expect(Object.keys(defaults).filter(key => defaults[key as keyof Model] !== changed[key as keyof Model])).toHaveLength(1);
  }
  await page.locator('[data-shell-experiment="length"]').click(); await page.locator('#birdlab-shell-position').fill('4');
  await checkNative(page, { ...defaults, length: 6 }, 4, 'current', defaults); await checkNative(page, defaults, 4, 'pinned', { ...defaults, length: 6 });
  expect(await physical(page, 'pinned')).toEqual(frozen); await page.locator('[data-shell-answer="limits"]').click(); await expect(page.locator('.birdlab-shell-feedback')).toContainText('Yes.');
  await page.locator('[data-shell-reset]').click(); await expect(page.locator('.birdlab-shell-feedback')).toHaveCount(0); await expect(page.locator('#birdlab-shell-position')).toHaveValue('4');
  await checkNative(page, defaults, 4, 'current', defaults); expect(await physical(page, 'pinned')).toEqual(frozen); expect(await page.locator('h2').allTextContents()).toEqual(legacyHeadings);
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.birdLab))).toBe(progress);
  const current = await physical(page); await page.evaluate(() => (window as any).__ctx.update('birdLab', 'blXp', 17));
  await expect.poll(() => page.evaluate(() => (window as any).__toolData.birdLab.blXp)).toBe(17);
  expect(await physical(page)).toEqual(current); expect(await physical(page, 'pinned')).toEqual(frozen); await expect(page.locator('#birdlab-shell-position')).toHaveValue('4');
  await settings(page, { count: 8, radius: 1, length: 6, gradient: 0 }); await page.locator('[data-shell-pin]').click();
  for (const kind of ['radius', 'length', 'count', 'reverse', 'equal']) await expect(page.locator('[data-shell-experiment="' + kind + '"]')).toBeDisabled();
  await page.locator('[data-shell-reset]').click(); await page.locator('[data-shell-pin]').click();
  for (const kind of ['radius', 'length', 'count', 'reverse', 'equal']) await expect(page.locator('[data-shell-experiment="' + kind + '"]')).toBeEnabled();
  await page.locator('[data-shell-clear]').click(); await expect(page.locator(condition('pinned'))).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).__toolData.birdLab.blXp)).toBe(17); expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('manual diffusion controls, fixed profile axes and pinned layouts remain readable and keyboard accessible at three host widths', async ({ page }) => {
  await mount(page);
  for (const layout of [{ viewport: 1280, host: 1100 }, { viewport: 390, host: 390 }, { viewport: 1280, host: 500 }]) {
    await sizing(page, layout.viewport, layout.host); await page.locator('[data-shell-reset]').click();
    for (const [key, min, step, max] of [['count', 1, 1, 8], ['radius', .25, .05, 1], ['length', 1, .25, 6], ['gradient', -1, .1, 1], ['position', 0, .1, 6]] as [string, number, number, number][]) {
      const input = page.locator('#birdlab-shell-' + key); await input.focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowLeft'); await expect(input).toHaveValue(String(min));
      await page.keyboard.press('ArrowRight'); await expect(input).toHaveValue(String(Number((min + step).toFixed(4)))); await expect(input).toBeFocused();
      await page.keyboard.press('End'); await page.keyboard.press('ArrowRight'); await expect(input).toHaveValue(String(max));
    }
    await page.locator('[data-shell-reset]').click(); await page.locator('#birdlab-shell-position').fill('1.5');
    const pin = page.locator('[data-shell-pin]'); await pin.focus(); await page.keyboard.press('Enter'); await expect(pin).toBeFocused();
    const radius = page.locator('[data-shell-experiment="radius"]'); await radius.focus(); await page.keyboard.press('Enter'); await expect(radius).toBeFocused();
    await checkNative(page, { ...defaults, radius: 1 }, 1.5, 'current', defaults); await checkNative(page, defaults, 1.5, 'pinned', { ...defaults, radius: 1 });
    const answer = page.locator('[data-shell-answer="limits"]'); await answer.focus(); await page.keyboard.press('Enter'); await expect(answer).toBeFocused(); await expect(page.locator('.birdlab-shell-feedback')).toContainText('Yes.');
    const host = (await page.locator('#wrap').boundingBox())!;
    for (const selector of [root, condition(), condition('pinned'), '.birdlab-shell-controls', '.birdlab-shell-position', '.birdlab-shell-comparison', '.birdlab-shell-evidence', '.birdlab-shell-model']) {
      const node = page.locator(selector), box = (await node.boundingBox())!; expect(box.x, selector).toBeGreaterThanOrEqual(host.x - 1); expect(box.x + box.width, selector).toBeLessThanOrEqual(host.x + host.width + 1);
      expect(await node.evaluate(element => element.scrollWidth - element.clientWidth), selector).toBeLessThanOrEqual(1);
    }
    for (const key of ['current', 'pinned']) for (const tag of ['cutaway', 'profile', 'rate-plot']) expect((await page.locator('[data-shell-' + tag + '="' + key + '"]').boundingBox())!.width).toBeGreaterThan(280);
    const columns = await page.locator('.birdlab-shell-conditions').evaluate(element => [...element.children].map(node => ({ top: node.getBoundingClientRect().top, left: node.getBoundingClientRect().left })));
    if (layout.host <= 500) { expect(columns[1].top).toBeGreaterThan(columns[0].top); expect(columns[1].left).toBeCloseTo(columns[0].left, 1); } else expect(columns[1].top).toBeCloseTo(columns[0].top, 1);
    const bounds = await page.locator(root).evaluate(element => [...element.querySelectorAll('svg text')].map(node => {
      const text = node as SVGTextElement, box = text.getBBox(), svg = text.ownerSVGElement!; return { text: text.textContent, x: box.x, right: box.x + box.width, top: box.y, bottom: box.y + box.height, width: svg.viewBox.baseVal.width, height: svg.viewBox.baseVal.height, size: parseFloat(getComputedStyle(text).fontSize) * svg.getBoundingClientRect().width / svg.viewBox.baseVal.width };
    }));
    for (const text of bounds) { expect(text.x, text.text || '').toBeGreaterThanOrEqual(0); expect(text.right, text.text || '').toBeLessThanOrEqual(text.width); expect(text.top, text.text || '').toBeGreaterThanOrEqual(0); expect(text.bottom, text.text || '').toBeLessThanOrEqual(text.height); expect(text.size, text.text || '').toBeGreaterThanOrEqual(11); }
    const violations = await page.evaluate(async () => {
      const result = await (window as any).axe.run(document.querySelector('[data-birdlab-shell-study]'), { runOnly: { type: 'rule', values: ['color-contrast', 'button-name', 'select-name', 'label', 'aria-valid-attr-value', 'aria-required-children', 'aria-required-parent', 'nested-interactive'] } });
      return result.violations.map((item: any) => ({ id: item.id, nodes: item.nodes.map((node: any) => node.target) }));
    }); expect(violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  }
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
