import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off' });
test.describe.configure({ timeout: 180_000, retries: 0 });
const harness = new GlHarness({ toolId: 'raptorHunt', toolFile: 'stem_lab/stem_tool_raptorhunt.js', width: 1100, height: 1000,
  layout: 'document', appStyles: true, extraScripts: ['node_modules/axe-core/axe.min.js'] });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

type Model = { version: number; duration: number; subject: number; pan: number; position: number };
const initial: Model = { version: 1, duration: 8, subject: 3, pan: 0, position: 14 };
const root = '[data-raptor-shutter-study]', kinds = ['subject', 'background'] as const;
async function mount(page: Page, shutterStudy?: any) {
  await page.setViewportSize({ width: 1280, height: 1000 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { raptorHunt: { activeSection: 'photography', shutterStudy, xp: 0 } }, undefined, { expectCanvas: false });
  await expect(page.locator(root)).toBeVisible();
}
async function replace(page: Page, model: any) {
  await page.evaluate(value => (window as any).__ctx.setToolData((old: any) => ({ ...old, raptorHunt: { ...old.raptorHunt, shutterStudy: value } })), model);
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}
async function range(page: Page, key: string, value: number) {
  await page.locator('#rh-shutter-' + key).evaluate((element: HTMLInputElement, next) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(element, String(next));
    element.dispatchEvent(new Event('input', { bubbles: true })); element.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
  await expect(page.locator('#rh-shutter-' + key)).toHaveValue(String(value));
}
async function physical(page: Page, key = 'current') {
  return page.locator('[data-shutter-condition="' + key + '"]').evaluate(element => ({
    duration: Number(element.getAttribute('data-shutter-duration')), subject: Number(element.getAttribute('data-shutter-subject')), pan: Number(element.getAttribute('data-shutter-pan')),
  }));
}
async function drawing(page: Page, key = 'current'): Promise<any> {
  return page.locator('[data-shutter-condition="' + key + '"]').evaluate(condition => {
    const plate = condition.querySelector('[data-shutter-plate]')!, profile = condition.querySelector('[data-shutter-profile]')!;
    const rect = (node: SVGRectElement) => [node.x.baseVal.value, node.y.baseVal.value, node.width.baseVal.value, node.height.baseVal.value];
    const circle = (node: SVGCircleElement) => [node.cx.baseVal.value, node.cy.baseVal.value];
    return ['subject', 'background'].map(kind => {
      const strip = plate.querySelector<SVGRectElement>('[data-shutter-strip="' + kind + '"]')!, curve = profile.querySelector<SVGPolylineElement>('[data-shutter-curve="' + kind + '"]')!;
      const motion = plate.querySelector<SVGLineElement>('[data-shutter-motion="' + kind + '"]')!, end = plate.querySelector<SVGPathElement>('[data-shutter-end="' + kind + '"]')!.getBBox();
      const gradient = plate.querySelector<SVGLinearGradientElement>('linearGradient[id$="-' + kind + '"]')!;
      return { kind, strip: rect(strip), fill: getComputedStyle(strip).fill,
        // Offset is SVGAnimatedNumber: baseVal itself is the scalar. Gradient
        // x1/x2 are SVGAnimatedLength and correctly use baseVal.value above.
        gradient: { x1: gradient.x1.baseVal.value, x2: gradient.x2.baseVal.value, stops: [...gradient.querySelectorAll('stop')].map(stop => [stop.offset.baseVal, Number(getComputedStyle(stop).stopOpacity)]) },
        motion: [motion.x1.baseVal.value, motion.y1.baseVal.value, motion.x2.baseVal.value, motion.y2.baseVal.value],
        start: circle(plate.querySelector<SVGCircleElement>('[data-shutter-start="' + kind + '"]')!), end: [end.x + end.width / 2, end.y + end.height / 2],
        points: [...Array(curve.points.numberOfItems)].map((_, index) => { const p = curve.points.getItem(index); return [p.x, p.y]; }),
        stroke: getComputedStyle(curve).stroke, strokeWidth: Number(getComputedStyle(curve).strokeWidth.replace('px', '')), dash: getComputedStyle(curve).strokeDasharray,
        sample: circle(profile.querySelector<SVGCircleElement>('[data-shutter-sample="' + kind + '"]')!),
        readout: Object.fromEntries(['relative', 'travel', 'width', 'brightness', 'area'].map(name => [name, condition.querySelector('[data-shutter-' + name + '="' + kind + '"]')!.textContent])),
      };
    });
  });
}
function imageX(native: number) { return (native - 70) * 128 / 530 - 64; }
function intensity(native: number) { return (280 - native) / 190; }
// Independent temporal quadrature: move the authored 16-unit bright interval
// and the camera separately at each midpoint of the shutter window. This does
// not evaluate a convolution, overlap-length expression, or trapezoid formula.
const divisions = 12_000;
function temporal(model: Model, kind: string, position: number) {
  if (model.duration === 0) return Math.abs(position) <= 8 ? 1 : 0;
  let covered = 0;
  for (let index = 0; index < divisions; index++) {
    const time = -model.duration / 2 + model.duration * (index + .5) / divisions;
    const worldMark = kind === 'subject' ? model.subject * time : 0, camera = model.pan * time;
    if (position >= worldMark - camera - 8 && position <= worldMark - camera + 8) covered++;
  }
  return covered / divisions;
}
function curveAt(points: number[][], position: number) {
  const values: number[] = [];
  for (let index = 1; index < points.length; index++) {
    const left = points[index - 1], right = points[index], a = imageX(left[0]), b = imageX(right[0]);
    if (position < a - 1e-8 || position > b + 1e-8) continue;
    if (Math.abs(b - a) < 1e-9) { values.push(intensity(left[1]), intensity(right[1])); continue; }
    values.push(intensity(left[1]) + (position - a) / (b - a) * (intensity(right[1]) - intensity(left[1])));
  }
  // A zero-travel sharp bar has two one-sided edge values; the authored mark
  // includes the edge, so its native upper point is the sampled edge value.
  return Math.max(...values);
}
function assertNative(actual: any[], model: Model) {
  expect(actual).toHaveLength(2);
  for (const row of actual) {
    const centerStart = (row.kind === 'subject' ? model.subject * (-model.duration / 2) : 0) - model.pan * (-model.duration / 2);
    const centerEnd = (row.kind === 'subject' ? model.subject * (model.duration / 2) : 0) - model.pan * (model.duration / 2);
    expect(imageX(row.motion[0])).toBeCloseTo(centerStart, 7); expect(imageX(row.motion[2])).toBeCloseTo(centerEnd, 7);
    expect(row.start).toEqual([row.motion[0], row.motion[1]]); expect(row.end[0]).toBeCloseTo(row.motion[2], 7); expect(row.end[1]).toBeCloseTo(row.motion[3], 7);
    expect(row.strip).toEqual([70, row.kind === 'subject' ? 100 : 250, 530, 40]); expect(row.fill).toContain('url(');
    expect(row.points).toHaveLength(6); expect(imageX(row.points[0][0])).toBe(-64); expect(imageX(row.points.at(-1)[0])).toBe(64);
    const points = row.points as number[][]; let area = 0;
    for (let index = 1; index < points.length; index++) {
      expect(points[index][0]).toBeGreaterThanOrEqual(points[index - 1][0]);
      area += (imageX(points[index][0]) - imageX(points[index - 1][0])) * (intensity(points[index][1]) + intensity(points[index - 1][1])) / 2;
    }
    // SVGPointList stores native coordinates as single-precision values.
    expect(Math.abs(area - 16), row.kind + ' native spatial area of the time average').toBeLessThan(2e-5);
    expect(imageX(points[4][0]) - imageX(points[1][0])).toBeCloseTo(16 + Math.abs(centerEnd - centerStart), 7);
    for (const point of points) { expect(intensity(point[1])).toBeGreaterThanOrEqual(-1e-9); expect(intensity(point[1])).toBeLessThanOrEqual(1 + 1e-9); }
    for (const position of [-63, -47.21, -32, -15.37, -8, -7.13, 0, 7.13, 8, 13.37, 25, 39.21, 63]) {
      expect(Math.abs(curveAt(points, position) - temporal(model, row.kind, position)), row.kind + ' temporal integration at ' + position).toBeLessThanOrEqual(3 / divisions);
    }
    expect(row.gradient.x1).toBe(70); expect(row.gradient.x2).toBe(600); expect(row.gradient.stops).toHaveLength(6);
    row.gradient.stops.forEach((stop: number[], index: number) => { expect(stop[0]).toBeCloseTo((points[index][0] - 70) / 530, 6); expect(stop[1]).toBeCloseTo(intensity(points[index][1]), 6); });
    expect(imageX(row.sample[0])).toBeCloseTo(model.position, 7); expect(Math.abs(intensity(row.sample[1]) - temporal(model, row.kind, model.position))).toBeLessThanOrEqual(3 / divisions);
    expect(Math.abs(Number(row.readout.brightness) - temporal(model, row.kind, model.position))).toBeLessThanOrEqual(.0005 + 3 / divisions);
    const statedVelocity = Number.parseFloat(row.readout.relative.replace('−', '-'));
    expect(statedVelocity).toBeCloseTo(row.kind === 'subject' ? model.subject - model.pan : -model.pan, 10);
    expect(Number.parseFloat(row.readout.travel)).toBeCloseTo(Math.abs(centerEnd - centerStart), 6);
    expect(Number.parseFloat(row.readout.width)).toBeCloseTo(imageX(points[4][0]) - imageX(points[1][0]), 6);
    expect(Number.parseFloat(row.readout.area)).toBe(16);
    expect(row.stroke).not.toBe('none'); expect(row.strokeWidth).toBeGreaterThan(2); if (row.kind === 'background') expect(row.dash).not.toBe('none');
  }
}

test('native exposure strips, signed window paths and profile areas agree with independent temporal integration through zero and extreme limits', async ({ page }) => {
  await mount(page);
  for (const patch of [
    {}, { pan: 3 }, { duration: 12, subject: 0, pan: 8 }, { duration: 12, subject: 6, pan: -2 },
    { duration: 0, subject: 6, pan: 8 }, { subject: 0, pan: 0, position: 8 }, { duration: 1, subject: 3 },
    { duration: 4, subject: 4 }, { duration: .5, subject: .5 }, { duration: .5, subject: 6, pan: 8 },
    { subject: 0, pan: 2 }, { duration: 0, position: 9 },
  ]) {
    const model = { ...initial, ...patch }; await replace(page, model); await expect(page.locator('#rh-shutter-duration')).toHaveValue(String(model.duration));
    await expect.poll(async () => (await physical(page)).pan).toBe(model.pan); assertNative(await drawing(page), model);
    if (model.duration === 0) await expect(page.locator('[data-shutter-condition="current"]')).toContainText('instantaneous-image limit');
  }
});

test('complete physical exposure pins, exact bounded comparisons and shared inspection survive reference browsing and unrelated writes without progress awards', async ({ page }) => {
  await mount(page); const pin = page.locator('[data-shutter-pin]'); await pin.click(); const frozen = await physical(page, 'pinned');
  await range(page, 'duration', 2); await range(page, 'subject', 6); await range(page, 'pan', 8); await range(page, 'position', 33);
  await page.locator('[data-shutter-experiment="match"]').click(); expect(await physical(page)).toEqual({ duration: 8, subject: 3, pan: 3 }); expect(await physical(page, 'pinned')).toEqual(frozen);
  assertNative(await drawing(page), { ...initial, pan: 3, position: 33 }); assertNative(await drawing(page, 'pinned'), { ...initial, position: 33 });
  await page.getByRole('tab', { name: /Gear/ }).click(); await expect(page.locator('[data-shutter-condition="pinned"]')).toBeVisible();
  await page.evaluate(() => (window as any).__ctx.setToolData((old: any) => ({ ...old, unrelatedRound19: 'kept', raptorHunt: { ...old.raptorHunt, unrelatedRound19: 'kept' } })));
  expect(await physical(page)).toEqual({ duration: 8, subject: 3, pan: 3 }); expect(await physical(page, 'pinned')).toEqual(frozen);
  await page.locator('[data-shutter-experiment="half"]').click(); expect(await physical(page)).toEqual({ duration: 4, subject: 3, pan: 0 });
  await expect(page.locator('[data-shutter-experiment="double"]')).toBeDisabled(); await expect(page.locator('[data-shutter-experiment="hold"]')).toBeDisabled();
  await page.locator('[data-shutter-experiment="instant"]').click(); expect(await physical(page)).toEqual({ duration: 0, subject: 3, pan: 0 });
  await page.locator('[data-shutter-answer="relative"]').click(); await expect(page.locator('.rh-shutter-feedback')).toContainText('Correct. Matching pan cancels the subject mark');
  await page.locator('[data-shutter-reset]').click(); await expect(page.locator('.rh-shutter-feedback')).toHaveCount(0); await expect(page.locator('#rh-shutter-position')).toHaveValue('33');
  expect(await physical(page)).toEqual(frozen); expect(await physical(page, 'pinned')).toEqual(frozen);
  await replace(page, { ...initial, duration: .5 }); await pin.click(); await expect(page.locator('[data-shutter-experiment="half"]')).toBeDisabled(); await expect(page.locator('[data-shutter-experiment="double"]')).toBeEnabled();
  await page.locator('[data-shutter-experiment="double"]').click(); await expect(page.locator('#rh-shutter-duration')).toHaveValue('1');
  await replace(page, { ...initial, duration: 0, pan: 3 }); await pin.click(); for (const kind of ['half', 'double', 'match', 'instant']) await expect(page.locator('[data-shutter-experiment="' + kind + '"]')).toBeDisabled();
  await page.locator('[data-shutter-clear]').click(); await expect(pin).toBeFocused(); await expect(page.locator('[data-shutter-condition="pinned"]')).toHaveCount(0);
  await replace(page, { version: 1, duration: Infinity, subject: '4', pan: -99, position: 100.6 }); await expect(page.locator('#rh-shutter-position')).toHaveValue('64'); expect(await physical(page)).toEqual({ duration: 8, subject: 3, pan: -2 });
  await replace(page, { version: 1, duration: 3.26, subject: 5.76, pan: -1.74, position: -12.6 }); await expect(page.locator('#rh-shutter-duration')).toHaveValue('3.5'); expect(await physical(page)).toEqual({ duration: 3.5, subject: 6, pan: -1.5 }); await expect(page.locator('#rh-shutter-position')).toHaveValue('-13');
  await range(page, 'position', -12); const saved = await page.evaluate(() => (window as any).__toolData.raptorHunt.shutterStudy);
  expect(saved).toEqual({ version: 1, duration: 3.5, subject: 6, pan: -1.5, position: -12 });
  expect(await page.evaluate(() => (window as any).__toolData.raptorHunt.xp)).toBe(0);
  await harness.destroy(page); await mount(page, saved); expect(await physical(page)).toEqual({ duration: 3.5, subject: 6, pan: -1.5 }); await expect(page.locator('#rh-shutter-position')).toHaveValue('-12');
  await replace(page, { version: 99, duration: 12, subject: 6, pan: 8, position: 64 }); await expect(page.locator('#rh-shutter-duration')).toHaveValue('8'); expect(await physical(page)).toEqual({ duration: 8, subject: 3, pan: 0 });
});

test('manual exposure and frozen comparisons remain keyboard accessible with readable native axes at desktop, phone and embedded widths', async ({ page }) => {
  await mount(page);
  for (const layout of [{ viewport: 1280, host: 1100 }, { viewport: 390, host: 390 }, { viewport: 1280, host: 500 }]) {
    await page.setViewportSize({ width: layout.viewport, height: 1000 });
    await page.locator('#wrap').evaluate((element: HTMLElement, width) => { element.style.width = width + 'px'; element.style.maxWidth = '100%'; element.setAttribute('data-stem-tool-shell', 'true'); }, layout.host);
    if (await page.locator('[data-shutter-condition="pinned"]').count()) await page.locator('[data-shutter-clear]').click(); await page.locator('[data-shutter-reset]').click();
    const duration = page.locator('#rh-shutter-duration'); await duration.focus(); await page.keyboard.press('End'); await page.keyboard.press('ArrowLeft'); await expect(duration).toHaveValue('11.5'); await expect(duration).toBeFocused(); await page.keyboard.press('Home'); await expect(duration).toHaveValue('0');
    const subject = page.locator('#rh-shutter-subject'); await subject.focus(); await page.keyboard.press('End'); await expect(subject).toHaveValue('6');
    const pan = page.locator('#rh-shutter-pan'); await pan.focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight'); await expect(pan).toHaveValue('-1.5');
    const position = page.locator('#rh-shutter-position'); await position.focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight'); await expect(position).toHaveValue('-63');
    const reset = page.locator('[data-shutter-reset]'); await reset.focus(); await page.keyboard.press('Enter'); await expect(reset).toBeFocused(); await expect(position).toHaveValue('-63'); await range(page, 'position', 14);
    const pin = page.locator('[data-shutter-pin]'); await pin.focus(); await page.keyboard.press('Enter'); await expect(pin).toBeFocused();
    const match = page.locator('[data-shutter-experiment="match"]'); await match.focus(); await page.keyboard.press('Enter'); await expect(match).toBeFocused();
    const answer = page.locator('[data-shutter-answer="relative"]'); await answer.focus(); await page.keyboard.press('Enter'); await expect(answer).toBeFocused(); await expect(page.locator('.rh-shutter-feedback')).toContainText('Correct. Matching pan cancels the subject mark');
    const host = (await page.locator('#wrap').boundingBox())!;
    for (const selector of [root, '.rh-shutter-controls', '.rh-shutter-comparison', '.rh-shutter-evidence', '.rh-shutter-model', '[data-shutter-condition="current"]', '[data-shutter-condition="pinned"]']) {
      const node = page.locator(selector), box = (await node.boundingBox())!; expect(box.x).toBeGreaterThanOrEqual(host.x - 1); expect(box.x + box.width).toBeLessThanOrEqual(host.x + host.width + 1); expect(await node.evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
    }
    const labels = await page.locator(root + ' svg text').evaluateAll(nodes => nodes.map(node => {
      const text = node as SVGTextElement, box = text.getBBox(), view = text.ownerSVGElement!.viewBox.baseVal, matrix = text.getScreenCTM()!;
      return { text: text.textContent, left: box.x, right: box.x + box.width, top: box.y, bottom: box.y + box.height, width: view.width, height: view.height, font: parseFloat(getComputedStyle(text).fontSize) * Math.hypot(matrix.a, matrix.b) };
    }));
    for (const label of labels) { expect(label.left, label.text || '').toBeGreaterThanOrEqual(0); expect(label.right, label.text || '').toBeLessThanOrEqual(label.width); expect(label.top, label.text || '').toBeGreaterThanOrEqual(0); expect(label.bottom, label.text || '').toBeLessThanOrEqual(label.height); expect(label.font, label.text || '').toBeGreaterThanOrEqual(11); }
    const violations = await page.evaluate(async () => (await (window as any).axe.run(document.querySelector('[data-raptor-shutter-study]'), { runOnly: { type: 'rule', values: ['color-contrast', 'button-name', 'select-name', 'label', 'aria-valid-attr-value', 'aria-required-children', 'aria-required-parent', 'nested-interactive'] } })).violations.map((item: any) => ({ id: item.id, nodes: item.nodes.map((node: any) => node.target) })));
    expect(violations).toEqual([]); expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  }
});
