import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off', hasTouch: true });
test.describe.configure({ timeout: 180_000, retries: 0 });
const harness = new GlHarness({ toolId: 'raptorHunt', toolFile: 'stem_lab/stem_tool_raptorhunt.js', width: 1100, height: 1000,
  layout: 'document', appStyles: true, extraScripts: ['node_modules/axe-core/axe.min.js'] });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

type Model = { version: number; magnification: number; apparent: number; distance: number; angle: number };
type Scalar = { native: number; decimal: number };
const initial: Model = { version: 1, magnification: 4, apparent: 60, distance: 60, angle: 8 };
const root = '[data-raptor-fov-study]', markers = [-16, -12, -8, -4, 0, 4, 8, 12, 16], radians = Math.PI / 180;
async function mount(page: Page, fieldViewStudy?: any) {
  await page.setViewportSize({ width: 1280, height: 1000 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { raptorHunt: { activeSection: 'gear', fieldViewStudy, xp: 0 } }, undefined, { expectCanvas: false });
  await expect(page.locator(root)).toBeVisible();
}
async function replace(page: Page, model: any) {
  await page.evaluate(value => (window as any).__ctx.setToolData((old: any) => ({ ...old, raptorHunt: { ...old.raptorHunt, fieldViewStudy: value } })), model);
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}
async function range(page: Page, key: string, value: number) {
  await page.locator('#rh-fov-' + key).evaluate((element: HTMLInputElement, next) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(element, String(next));
    element.dispatchEvent(new Event('input', { bubbles: true })); element.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
  await expect(page.locator('#rh-fov-' + key)).toHaveValue(String(value));
  if (key === 'angle') await expect.poll(() => page.locator('[data-fov-condition="current"] [data-fov-scene-inspector]').evaluate((node: SVGLineElement) => node.x1.baseVal.value)).toBe(80 + (value + 20) * 12);
  else await expect(page.locator('[data-fov-condition="current"]')).toHaveAttribute('data-fov-' + key, String(value));
}
async function physical(page: Page, key = 'current') {
  return page.locator('[data-fov-condition="' + key + '"]').evaluate(element => ({
    magnification: Number(element.getAttribute('data-fov-magnification')), apparent: Number(element.getAttribute('data-fov-apparent')), distance: Number(element.getAttribute('data-fov-distance')),
  }));
}
async function drawing(page: Page, key = 'current'): Promise<any> {
  return page.locator('[data-fov-condition="' + key + '"]').evaluate(condition => {
    const plan = condition.querySelector('[data-fov-plan]')!, angular = condition.querySelector('[data-fov-angular]')!;
    const scalar = (node: Element, name: string) => ({ native: (node as any)[name].baseVal.value, decimal: Number(node.getAttribute(name)) });
    const values = (node: Element, names: string[]) => names.map(name => scalar(node, name));
    const line = (node: Element) => values(node, ['x1', 'y1', 'x2', 'y2']), rect = (node: Element) => values(node, ['x', 'y', 'width', 'height']);
    const polygon = plan.querySelector<SVGPolygonElement>('[data-fov-cone]')!, decimals = polygon.getAttribute('points')!.trim().split(/[\s,]+/).map(Number);
    return {
      visible: condition.getAttribute('data-fov-visible'),
      cone: Array.from({ length: polygon.points.numberOfItems }, (_, i) => { const point = polygon.points.getItem(i); return [{ native: point.x, decimal: decimals[i * 2] }, { native: point.y, decimal: decimals[i * 2 + 1] }]; }),
      plane: line(plan.querySelector('[data-fov-plane]')!), width: line(plan.querySelector('[data-fov-width]')!), ray: line(plan.querySelector('[data-fov-target-ray]')!),
      worldTarget: values(plan.querySelector('[data-fov-world-target]')!, ['cx', 'cy']), rayDash: getComputedStyle(plan.querySelector('[data-fov-target-ray]')!).strokeDasharray,
      realWindow: rect(angular.querySelector('[data-fov-real-window]')!), apparentWindow: rect(angular.querySelector('[data-fov-apparent-window]')!),
      realInspector: line(angular.querySelector('[data-fov-scene-inspector]')!), apparentInspector: line(angular.querySelector('[data-fov-apparent-inspector]')!),
      scene: [...angular.querySelectorAll<SVGCircleElement>('[data-fov-scene-point]')].map(node => ({ angle: Number(node.getAttribute('data-fov-scene-point')), position: values(node, ['cx', 'cy']), fill: getComputedStyle(node).fill, stroke: getComputedStyle(node).stroke })),
      apparent: [...angular.querySelectorAll<SVGCircleElement>('[data-fov-apparent-point]')].map(node => ({ angle: Number(node.getAttribute('data-fov-apparent-point')), position: values(node, ['cx', 'cy']) })),
      readings: Object.fromEntries(['real-field', 'linear-width', 'beta', 'offset', 'status', 'count'].map(name => [name, condition.querySelector('[data-fov-' + name + ']')!.textContent])),
    };
  });
}

// Independent vector construction: take a unit apparent-edge ray, undo only
// its lateral magnification, and intersect it with the transverse D-plane.
// For individual scene rays, scale the lateral component of (cos a, sin a)
// and read its direction with atan2. This avoids the app's tan/atan formulas.
function oracle(model: Model) {
  const edge = { forward: Math.cos(model.apparent * radians / 2), lateral: Math.sin(model.apparent * radians / 2) / model.magnification };
  const half = Math.atan2(edge.lateral, edge.forward) / radians, offset = model.distance * Math.sin(model.angle * radians) / Math.cos(model.angle * radians);
  const direction = (angle: number) => Math.atan2(model.magnification * Math.sin(angle * radians), Math.cos(angle * radians)) / radians;
  const visible = (angle: number) => Math.abs(model.magnification * Math.sin(angle * radians)) <= Math.cos(angle * radians) * Math.sin(model.apparent * radians / 2) / Math.cos(model.apparent * radians / 2) + 1e-12;
  return { half, edge: model.distance * edge.lateral / edge.forward, offset, beta: direction(model.angle), direction, visible };
}
// SVG native coordinates may be Float32 even though their decimal attributes
// retain doubles. The bound below is the ACTUAL parse delta of each coordinate,
// not a widened blanket tolerance. Both values are checked against our oracle.
function coordinate(value: Scalar, expected: number) {
  expect(Math.abs(value.decimal - expected)).toBeLessThanOrEqual(1e-8);
  expect(Math.abs(value.native - expected)).toBeLessThanOrEqual(Math.abs(value.native - value.decimal) + 1e-8);
}
function coordinates(actual: Scalar[], expected: number[]) { expect(actual).toHaveLength(expected.length); actual.forEach((value, i) => coordinate(value, expected[i])); }
function numeric(text: string) { return parseFloat(text.replace('−', '-').replace('+', '')); }
function assertNative(actual: any, model: Model) {
  const expected = oracle(model), targetVisible = expected.visible(model.angle), plane = 450 - model.distance * 3.5, edge = expected.edge * 3.5, target = 320 + expected.offset * 3.5;
  expect(actual.visible).toBe(String(targetVisible)); expect(actual.cone).toHaveLength(3);
  coordinates(actual.cone[0], [320, 450]); coordinates(actual.cone[1], [320 - edge, plane]); coordinates(actual.cone[2], [320 + edge, plane]);
  coordinates(actual.plane, [110, plane, 530, plane]); coordinates(actual.width, [320 - edge, plane, 320 + edge, plane]);
  coordinates(actual.ray, [320, 450, target, plane]); coordinates(actual.worldTarget, [target, plane]);
  if (targetVisible) expect(actual.rayDash).toBe('none'); else expect(actual.rayDash).not.toBe('none');
  coordinates(actual.realWindow, [320 - expected.half * 12, 112, expected.half * 24, 56]);
  coordinates(actual.apparentWindow, [320 - model.apparent * 1.5, 298, model.apparent * 3, 56]);
  coordinates(actual.realInspector, [320 + model.angle * 12, 102, 320 + model.angle * 12, 178]);
  coordinates(actual.apparentInspector, [320 + expected.beta * 3, 288, 320 + expected.beta * 3, 364]);
  expect(actual.scene).toHaveLength(9);
  for (const point of actual.scene) {
    expect(markers).toContain(point.angle); coordinates(point.position, [320 + point.angle * 12, 130]);
    expect(point.fill).toBe(expected.visible(point.angle) ? 'rgb(255, 220, 158)' : 'rgb(19, 45, 66)');
  }
  expect(actual.apparent.map((point: any) => point.angle)).toEqual(markers.filter(expected.visible));
  for (const point of actual.apparent) coordinates(point.position, [320 + expected.direction(point.angle) * 3, 316]);
  expect(Math.abs(numeric(actual.readings['real-field']) - expected.half * 2)).toBeLessThanOrEqual(.000501);
  expect(Math.abs(numeric(actual.readings['linear-width']) - expected.edge * 2)).toBeLessThanOrEqual(.000501);
  expect(Math.abs(numeric(actual.readings.beta) - expected.beta)).toBeLessThanOrEqual(.000501);
  expect(Math.abs(numeric(actual.readings.offset) - expected.offset)).toBeLessThanOrEqual(.000501);
  expect(actual.readings.status).toBe(targetVisible ? 'Inside the field' : 'Outside the field'); expect(actual.readings.count).toBe(markers.filter(expected.visible).length + ' of 9');
  // Recover actual rays from native endpoint geometry. The error allowance
  // propagates ONLY the observed Float32 deltas through subtraction/division.
  const right = actual.cone[2] as Scalar[], origin = actual.cone[0] as Scalar[];
  const lateral = (right[0].native - origin[0].native) / 3.5, forward = (origin[1].native - right[1].native) / 3.5;
  const lateralError = (Math.abs(right[0].native - right[0].decimal) + Math.abs(origin[0].native - origin[0].decimal)) / 3.5;
  const forwardError = (Math.abs(origin[1].native - origin[1].decimal) + Math.abs(right[1].native - right[1].decimal)) / 3.5;
  const apparentSlope = Math.sin(model.apparent * radians / 2) / Math.cos(model.apparent * radians / 2);
  expect(Math.abs(model.magnification * lateral - forward * apparentSlope)).toBeLessThanOrEqual(model.magnification * lateralError + apparentSlope * forwardError + 1e-8);
}

test('native field cones, angular windows and admitted markers agree with independent scaled-ray geometry across magnification, distance and off-field limits', async ({ page }) => {
  await mount(page);
  for (const patch of [
    {}, { magnification: 8 }, { magnification: 2, apparent: 70, distance: 100, angle: 20 }, { magnification: 12, apparent: 20, distance: 20, angle: 0 },
    { magnification: 12, apparent: 70, distance: 100, angle: -20 }, { magnification: 3, apparent: 25, distance: 25, angle: -.5 },
    { angle: -8 }, { angle: 0 }, { angle: 8.5 }, { apparent: 70, angle: 8.5 }, { distance: 20 }, { distance: 100 },
    { magnification: 2, apparent: 20, angle: 4 }, { magnification: 12, apparent: 70, angle: 4 },
  ]) {
    const model = { ...initial, ...patch }; await replace(page, model);
    await expect(page.locator('[data-fov-condition="current"]')).toHaveAttribute('data-fov-distance', String(model.distance));
    await expect.poll(() => page.locator('[data-fov-condition="current"] [data-fov-scene-inspector]').evaluate((line: SVGLineElement) => line.x1.baseVal.value)).toBe(320 + model.angle * 12);
    assertNative(await drawing(page), model);
  }
});

test('frozen full viewing designs and exact bounded experiments preserve shared off-field inspection, references, host writes and saved values without progress awards', async ({ page }) => {
  await mount(page); const pin = page.locator('[data-fov-pin]'); await pin.click(); const frozen = await physical(page, 'pinned');
  await range(page, 'magnification', 12); await range(page, 'apparent', 20); await range(page, 'distance', 100); await range(page, 'angle', -16);
  await page.locator('[data-fov-experiment="doubleM"]').click(); expect(await physical(page)).toEqual({ magnification: 8, apparent: 60, distance: 60 }); expect(await physical(page, 'pinned')).toEqual(frozen);
  await range(page, 'angle', 8); assertNative(await drawing(page), { ...initial, magnification: 8 }); assertNative(await drawing(page, 'pinned'), initial);
  await expect(page.locator('[data-fov-condition="current"]')).toHaveAttribute('data-fov-visible', 'false'); await expect(page.locator('[data-fov-condition="pinned"]')).toHaveAttribute('data-fov-visible', 'true');
  const stable = await drawing(page); await page.getByRole('button', { name: 'Spotting scope', exact: true }).click(); expect(await drawing(page)).toEqual(stable);
  await page.evaluate(() => (window as any).__ctx.setToolData((old: any) => ({ ...old, unrelatedRound21: 'kept', raptorHunt: { ...old.raptorHunt, unrelatedRound21: 'kept' } })));
  expect(await physical(page)).toEqual({ magnification: 8, apparent: 60, distance: 60 }); expect(await physical(page, 'pinned')).toEqual(frozen); expect(await drawing(page)).toEqual(stable);
  for (const [kind, model] of [ ['halfM', { magnification: 2, apparent: 60, distance: 60 }], ['widen', { magnification: 4, apparent: 70, distance: 60 }], ['narrow', { magnification: 4, apparent: 50, distance: 60 }], ['halfD', { magnification: 4, apparent: 60, distance: 30 }] ] as const) {
    await page.locator('[data-fov-experiment="' + kind + '"]').click(); expect(await physical(page)).toEqual(model); expect(await physical(page, 'pinned')).toEqual(frozen); await expect(page.locator('#rh-fov-angle')).toHaveValue('8'); assertNative(await drawing(page), { ...initial, ...model });
  }
  await expect(page.locator('[data-fov-experiment="doubleD"]')).toBeDisabled();
  const near = await drawing(page); await page.locator('[data-fov-reset]').click(); const far = await drawing(page);
  expect(near.realWindow).toEqual(far.realWindow); expect(near.apparentWindow).toEqual(far.apparentWindow); expect(near.apparentInspector).toEqual(far.apparentInspector);
  expect(numeric(far.readings['linear-width'])).toBeCloseTo(2 * numeric(near.readings['linear-width']), 2);
  await page.locator('[data-fov-answer="narrow"]').click(); await expect(page.locator('.rh-fov-feedback')).toContainText('Correct. At fixed apparent field'); await page.locator('[data-fov-reset]').click(); await expect(page.locator('.rh-fov-feedback')).toHaveCount(0); expect(await physical(page)).toEqual(frozen); expect(await physical(page, 'pinned')).toEqual(frozen);
  await replace(page, { ...initial, magnification: 3, apparent: 25, distance: 25 }); await pin.click();
  for (const kind of ['halfM', 'narrow', 'halfD']) await expect(page.locator('[data-fov-experiment="' + kind + '"]')).toBeDisabled();
  await page.locator('[data-fov-experiment="doubleD"]').click(); expect(await physical(page)).toEqual({ magnification: 3, apparent: 25, distance: 50 });
  await page.locator('[data-fov-experiment="doubleM"]').click(); expect(await physical(page)).toEqual({ magnification: 6, apparent: 25, distance: 25 });
  // Both exact halves are numerically inside their ranges, but neither is a
  // representable control step. They must be unavailable rather than rounded.
  await replace(page, { ...initial, magnification: 5, distance: 45 }); await pin.click();
  for (const kind of ['halfM', 'halfD']) await expect(page.locator('[data-fov-experiment="' + kind + '"]')).toBeDisabled();
  for (const kind of ['doubleM', 'doubleD']) await expect(page.locator('[data-fov-experiment="' + kind + '"]')).toBeEnabled();
  await page.locator('[data-fov-experiment="doubleM"]').click(); expect(await physical(page)).toEqual({ magnification: 10, apparent: 60, distance: 45 });
  await page.locator('[data-fov-experiment="doubleD"]').click(); expect(await physical(page)).toEqual({ magnification: 5, apparent: 60, distance: 90 });
  await replace(page, { ...initial, magnification: 12, apparent: 70, distance: 100 }); await pin.click();
  for (const kind of ['doubleM', 'widen', 'doubleD']) await expect(page.locator('[data-fov-experiment="' + kind + '"]')).toBeDisabled();
  await page.locator('[data-fov-experiment="halfM"]').click(); expect(await physical(page)).toEqual({ magnification: 6, apparent: 70, distance: 100 });
  await replace(page, { ...initial, magnification: 2, apparent: 20, distance: 20 }); await pin.click();
  for (const kind of ['halfM', 'narrow', 'halfD']) await expect(page.locator('[data-fov-experiment="' + kind + '"]')).toBeDisabled();
  await page.locator('[data-fov-clear]').click(); await expect(pin).toBeFocused(); await expect(page.locator('[data-fov-condition="pinned"]')).toHaveCount(0);
  await replace(page, { version: 1, magnification: Infinity, apparent: '30', distance: -99, angle: 100.6 }); expect(await physical(page)).toEqual({ magnification: 4, apparent: 60, distance: 20 }); await expect(page.locator('#rh-fov-angle')).toHaveValue('20');
  await replace(page, { version: 1, magnification: 5.6, apparent: 32.6, distance: 32.49, angle: -3.26 }); expect(await physical(page)).toEqual({ magnification: 6, apparent: 35, distance: 30 }); await expect(page.locator('#rh-fov-angle')).toHaveValue('-3.5');
  await range(page, 'angle', -4); const saved = await page.evaluate(() => (window as any).__toolData.raptorHunt.fieldViewStudy); expect(saved).toEqual({ version: 1, magnification: 6, apparent: 35, distance: 30, angle: -4 });
  const host = await page.evaluate(() => (window as any).__toolData); expect(host.raptorHunt.xp).toBe(0); expect(host.unrelatedRound21).toBe('kept'); expect(host.raptorHunt.unrelatedRound21).toBe('kept');
  await harness.destroy(page); await mount(page, saved); expect(await physical(page)).toEqual({ magnification: 6, apparent: 35, distance: 30 }); await expect(page.locator('#rh-fov-angle')).toHaveValue('-4'); await expect(page.locator('[data-fov-condition="pinned"]')).toHaveCount(0);
  await replace(page, { version: 99, magnification: 12, apparent: 70, distance: 100, angle: 20 }); expect(await physical(page)).toEqual(frozen); await expect(page.locator('#rh-fov-angle')).toHaveValue('8');
});

test('touch and keyboard direction inspection, frozen comparisons and readable native plots pass eight accessibility rules at desktop, phone and embedded widths', async ({ page }) => {
  await mount(page);
  await expect(page.getByRole('group', { name: 'Inspect a numbered scene direction', exact: true })).toHaveClass('rh-fov-marker-buttons');
  for (const layout of [{ viewport: 1280, host: 1100 }, { viewport: 390, host: 390 }, { viewport: 1280, host: 500 }]) {
    await page.setViewportSize({ width: layout.viewport, height: 1000 });
    await page.locator('#wrap').evaluate((element: HTMLElement, width) => { element.style.width = width + 'px'; element.style.maxWidth = '100%'; element.setAttribute('data-stem-tool-shell', 'true'); }, layout.host);
    if (await page.locator('[data-fov-condition="pinned"]').count()) await page.locator('[data-fov-clear]').click(); await page.locator('[data-fov-reset]').click();
    const magnification = page.locator('#rh-fov-magnification'); await magnification.focus(); await page.keyboard.press('End'); await page.keyboard.press('ArrowLeft'); await expect(magnification).toHaveValue('11'); await expect(magnification).toBeFocused(); await page.keyboard.press('Home'); await expect(magnification).toHaveValue('2');
    const apparent = page.locator('#rh-fov-apparent'); await apparent.focus(); await page.keyboard.press('End'); await page.keyboard.press('ArrowLeft'); await expect(apparent).toHaveValue('65');
    const distance = page.locator('#rh-fov-distance'); await distance.focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight'); await expect(distance).toHaveValue('25');
    const angle = page.locator('#rh-fov-angle'); await angle.focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight'); await expect(angle).toHaveValue('-19.5'); await expect(angle).toBeFocused();
    const reset = page.locator('[data-fov-reset]'); await reset.focus(); await page.keyboard.press('Enter'); await expect(reset).toBeFocused(); await expect(angle).toHaveValue('-19.5');
    const current = page.locator('[data-fov-condition="current"]'), nativeMarker = current.locator('[data-fov-marker="12"]');
    await nativeMarker.focus(); await page.keyboard.press('Enter'); await expect(nativeMarker).toBeFocused(); await expect(angle).toHaveValue('12');
    await current.locator('[data-fov-marker="-8"]').tap(); await expect(angle).toHaveValue('-8');
    const equivalent = page.locator('[data-fov-select="8"]'); await equivalent.tap(); await expect(angle).toHaveValue('8');
    const touchBox = (await equivalent.boundingBox())!; expect(touchBox.height).toBeGreaterThanOrEqual(44); expect(touchBox.width).toBeGreaterThanOrEqual(44);
    const pin = page.locator('[data-fov-pin]'); await pin.focus(); await page.keyboard.press('Enter'); await expect(pin).toBeFocused();
    const double = page.locator('[data-fov-experiment="doubleM"]'); await double.focus(); await page.keyboard.press('Enter'); await expect(double).toBeFocused();
    await expect(current).toHaveAttribute('data-fov-magnification', '8'); await expect(current).toHaveAttribute('data-fov-visible', 'false');
    const answer = page.locator('[data-fov-answer="narrow"]'); await answer.focus(); await page.keyboard.press('Enter'); await expect(answer).toBeFocused(); await expect(page.locator('.rh-fov-feedback')).toContainText('Correct.');
    const host = (await page.locator('#wrap').boundingBox())!;
    for (const selector of [root, '.rh-fov-controls', '.rh-fov-marker-buttons', '.rh-fov-comparison', '.rh-fov-evidence', '.rh-fov-model', '[data-fov-condition="current"]', '[data-fov-condition="pinned"]']) {
      const node = page.locator(selector), box = (await node.boundingBox())!; expect(box.x).toBeGreaterThanOrEqual(host.x - 1); expect(box.x + box.width).toBeLessThanOrEqual(host.x + host.width + 1); expect(await node.evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
    }
    const labels = await page.locator(root + ' svg text').evaluateAll(nodes => nodes.map(node => {
      const text = node as SVGTextElement, box = text.getBBox(), view = text.ownerSVGElement!.viewBox.baseVal, matrix = text.getScreenCTM()!;
      return { text: text.textContent, left: box.x, right: box.x + box.width, top: box.y, bottom: box.y + box.height, width: view.width, height: view.height, font: parseFloat(getComputedStyle(text).fontSize) * Math.hypot(matrix.a, matrix.b) };
    }));
    for (const label of labels) { expect(label.left, label.text || '').toBeGreaterThanOrEqual(0); expect(label.right, label.text || '').toBeLessThanOrEqual(label.width); expect(label.top, label.text || '').toBeGreaterThanOrEqual(0); expect(label.bottom, label.text || '').toBeLessThanOrEqual(label.height); expect(label.font, label.text || '').toBeGreaterThanOrEqual(11); }
    const violations = await page.evaluate(async () => (await (window as any).axe.run(document.querySelector('[data-raptor-fov-study]'), { runOnly: { type: 'rule', values: ['color-contrast', 'button-name', 'select-name', 'label', 'aria-valid-attr-value', 'aria-required-children', 'aria-required-parent', 'nested-interactive'] } })).violations.map((item: any) => ({ id: item.id, nodes: item.nodes.map((node: any) => node.target) })));
    expect(violations).toEqual([]); expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  }
});
