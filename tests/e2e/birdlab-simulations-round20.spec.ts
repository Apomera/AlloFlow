import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off', hasTouch: true });
test.describe.configure({ retries: 0, timeout: 180_000 });
const harness = new GlHarness({ toolId: 'birdLab', toolFile: 'stem_lab/stem_tool_birdlab.js', preScripts: ['stem_lab/stem_lab_module.js'],
  extraScripts: ['node_modules/axe-core/axe.min.js'], width: 1100, height: 1000, appStyles: true, layout: 'document' });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

type Model = { turn: number; head: number; tail: number };
const defaults: Model = { turn: 15, head: 35, tail: 15 };
const root = '[data-birdlab-sketch-study]', condition = (key = 'current') => '[data-sketch-condition="' + key + '"]';
const near = (actual: number, expected: number, tolerance = 1e-5) => expect(Math.abs(actual - expected)).toBeLessThan(tolerance);
const distance = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const average = (a: number[], b: number[]) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
const landmarks = (native: any): Record<string, number[]> => ({ body: native.body.center, head: native.head.center, bill: native.bill[1], tail: average(native.tail[1], native.tail[2]) });
const landmarkErrors = (native: any): Record<string, number[]> => ({ body: native.errors.body.center, head: native.errors.head.center, bill: native.errors.bill[1], tail: average(native.errors.tail[1], native.errors.tail[2]) });
// Reverse triangle inequality: moving either endpoint by its error vector can
// change their Euclidean distance by at most the norm of the summed bounds.
const distanceError = (a: number[], b: number[]) => Math.hypot(a[0] + b[0], a[1] + b[1]);
const precision = (bound: number) => Math.max(1e-5, bound + 1e-8);
function sameNative(actual: any, expected: any, actualError?: any, expectedError?: any) {
  if (typeof expected === 'number') { near(actual, expected, precision((actualError || 0) + (expectedError || 0))); return; }
  if (Array.isArray(expected)) { expect(actual).toHaveLength(expected.length); expected.forEach((value, index) => sameNative(actual[index], value, actualError?.[index], expectedError?.[index])); return; }
  if (expected && typeof expected === 'object') { expect(Object.keys(actual)).toEqual(Object.keys(expected)); for (const key of Object.keys(expected)) sameNative(actual[key], expected[key], actualError?.[key], expectedError?.[key]); return; }
  expect(actual).toEqual(expected);
}
async function sizing(page: Page, viewport: number, host: number) {
  await page.setViewportSize({ width: viewport, height: 1000 });
  await page.locator('#wrap').evaluate((node: HTMLElement, width) => { node.style.width = width + 'px'; node.style.maxWidth = '100%'; node.setAttribute('data-stem-tool-shell', 'true'); }, host);
}
async function mount(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { birdLab: { view: 'drawing', blXp: 0, blLifeList: {}, blBadges: {} } }, undefined, { expectCanvas: false });
  await sizing(page, 1280, 1100); await expect(page.locator(root)).toBeVisible();
}
async function physical(page: Page, key = 'current'): Promise<Model> {
  return page.locator(condition(key)).evaluate(node => Object.fromEntries(['turn', 'head', 'tail'].map(name => [name, Number(node.getAttribute('data-sketch-' + name))])) as Model);
}
async function settings(page: Page, model: Model) {
  for (const [name, value] of Object.entries(model)) await page.locator('#birdlab-sketch-' + name).fill(String(value));
  await expect.poll(() => physical(page)).toEqual(model);
}
// Read actual transformed shape geometry rather than the model's coordinates
// or a copied transform attribute. Inverting the root SVG screen matrix also
// removes the host's responsive scale before checking equal native units.
async function drawing(page: Page, key = 'current'): Promise<any> {
  return page.locator('[data-sketch-map="' + key + '"]').evaluate((element, name) => {
    const svg = element as SVGSVGElement;
    function point(node: SVGGraphicsElement, x: number, y: number) {
      const matrix = svg.getScreenCTM()!.inverse().multiply(node.getScreenCTM()!);
      const value = new DOMPoint(x, y).matrixTransform(matrix); return [value.x, value.y];
    }
    // Chromium's SVG decimal parser can accumulate more than half an ULP:
    // GenericParseNumber uses Float32 fractional multiply/add operations.
    // Use the observed raw attribute -> native value parse delta, rather than
    // assuming one correctly rounded conversion. This bounds only parsing;
    // an incorrectly authored shape still fails the independent model oracle.
    // DOMPoint.matrixTransform uses double arithmetic. Its roundoff is covered
    // by the 1e-8 guard after these CTM-propagated input bounds are combined.
    function inputError(actual: number, source: number) { return Math.abs(actual - source) + 4 * Number.EPSILON * Math.max(1, Math.abs(source)); }
    function lengthError(node: SVGGraphicsElement, name: string) { return inputError((node as any)[name].baseVal.value, Number(node.getAttribute(name))); }
    function uncertainty(node: SVGGraphicsElement, xError: number, yError: number) {
      const matrix = svg.getScreenCTM()!.inverse().multiply(node.getScreenCTM()!);
      return [Math.abs(matrix.a) * xError + Math.abs(matrix.c) * yError, Math.abs(matrix.b) * xError + Math.abs(matrix.d) * yError];
    }
    function polygonUncertainty(node: SVGPolygonElement) {
      const source = node.getAttribute('points')!.trim().split(/[\s,]+/).map(Number);
      return Array.from({ length: node.points.numberOfItems }, (_, index) => { const p = node.points.getItem(index); return uncertainty(node, inputError(p.x, source[index * 2]), inputError(p.y, source[index * 2 + 1])); });
    }
    function centerUncertainty(node: SVGGraphicsElement) { return uncertainty(node, lengthError(node, 'cx'), lengthError(node, 'cy')); }
    function diameterUncertainty(node: SVGGraphicsElement, radius: string, horizontal = true) {
      const xError = lengthError(node, 'cx') + (horizontal ? lengthError(node, radius) : 0), yError = lengthError(node, 'cy') + (horizontal ? 0 : lengthError(node, radius));
      return [uncertainty(node, xError, yError), uncertainty(node, xError, yError)];
    }
    function lineUncertainty(node: SVGLineElement) { return [uncertainty(node, lengthError(node, 'x1'), lengthError(node, 'y1')), uncertainty(node, lengthError(node, 'x2'), lengthError(node, 'y2'))]; }
    function line(node: SVGLineElement) { return [point(node, node.x1.baseVal.value, node.y1.baseVal.value), point(node, node.x2.baseVal.value, node.y2.baseVal.value)]; }
    function polygon(node: SVGPolygonElement) { return Array.from({ length: node.points.numberOfItems }, (_, index) => { const p = node.points.getItem(index); return point(node, p.x, p.y); }); }
    const body = svg.querySelector('[data-sketch-body]') as SVGEllipseElement, head = svg.querySelector('[data-sketch-head-shape]') as SVGCircleElement;
    const parent = svg.closest('figure')!, tail = svg.querySelector('[data-sketch-tail-shape]') as SVGPolygonElement, bill = svg.querySelector('[data-sketch-bill-shape]') as SVGPolygonElement;
    return { viewBox: svg.getAttribute('viewBox'),
      body: { center: point(body, body.cx.baseVal.value, body.cy.baseVal.value),
        major: [point(body, body.cx.baseVal.value - body.rx.baseVal.value, body.cy.baseVal.value), point(body, body.cx.baseVal.value + body.rx.baseVal.value, body.cy.baseVal.value)],
        minor: [point(body, body.cx.baseVal.value, body.cy.baseVal.value - body.ry.baseVal.value), point(body, body.cx.baseVal.value, body.cy.baseVal.value + body.ry.baseVal.value)] },
      head: { center: point(head, head.cx.baseVal.value, head.cy.baseVal.value),
        diameter: [point(head, head.cx.baseVal.value - head.r.baseVal.value, head.cy.baseVal.value), point(head, head.cx.baseVal.value + head.r.baseVal.value, head.cy.baseVal.value)] },
      tail: polygon(tail), bill: polygon(bill),
      anchors: Object.fromEntries([...svg.querySelectorAll('[data-sketch-anchor]')].map(node => { const circle = node as SVGCircleElement; return [circle.getAttribute('data-sketch-anchor')!.split(':')[1], point(circle, circle.cx.baseVal.value, circle.cy.baseVal.value)]; })),
      selected: [...svg.querySelectorAll('[data-sketch-hotspot]')].filter(node => node.getAttribute('aria-pressed') === 'true').map(node => node.getAttribute('data-sketch-hotspot')!.split(':')[1]),
      rulers: Object.fromEntries(['body', 'head', 'tail'].map(kind => { const node = svg.querySelector('[data-sketch-ruler="' + name + ':' + kind + '"]') as SVGLineElement | null; return [kind, node ? line(node) : null]; })),
      errors: {
        body: { center: centerUncertainty(body), major: diameterUncertainty(body, 'rx'), minor: diameterUncertainty(body, 'ry', false) },
        head: { center: centerUncertainty(head), diameter: diameterUncertainty(head, 'r') },
        tail: polygonUncertainty(tail), bill: polygonUncertainty(bill),
        anchors: Object.fromEntries([...svg.querySelectorAll('[data-sketch-anchor]')].map(node => [node.getAttribute('data-sketch-anchor')!.split(':')[1], centerUncertainty(node as SVGCircleElement)])),
        rulers: Object.fromEntries(['body', 'head', 'tail'].map(kind => { const node = svg.querySelector('[data-sketch-ruler="' + name + ':' + kind + '"]') as SVGLineElement | null; return [kind, node ? lineUncertainty(node) : null]; })) },
      readings: Object.fromEntries(['ratio', 'length', 'x', 'y'].map(kind => [kind, parseFloat(parent.querySelector('[data-sketch-value="' + name + ':' + kind + '"]')!.textContent!)])) };
  }, key);
}
function verify(native: any, model: Model, landmark = 'head', guides = true) {
  expect(native.viewBox).toBe('0 0 640 530'); expect(native.tail).toHaveLength(4); expect(native.bill).toHaveLength(3);
  const bodyLength = distance(...native.body.major), headDiameter = distance(...native.head.diameter);
  near(bodyLength, 190, precision(distanceError(...native.errors.body.major))); near(distance(...native.body.minor), 104.5, precision(distanceError(...native.errors.body.minor))); near(headDiameter / bodyLength * 100, model.head);
  const forward = native.body.major[1].map((value: number, index: number) => (value - native.body.major[0][index]) / bodyLength);
  const up = native.body.minor[1].map((value: number, index: number) => (value - native.body.minor[0][index]) / 104.5);
  near(forward[0], Math.cos(model.turn * Math.PI / 180)); near(forward[1], -Math.sin(model.turn * Math.PI / 180));
  near(forward[0] * up[0] + forward[1] * up[1], 0);
  for (const [index, expected] of [330, 270].entries()) near(native.body.center[index], expected, precision(native.errors.body.center[index]));
  const relative = (p: number[]) => { const delta = p.map((value, index) => (value - native.body.center[index]) / 95); return [delta[0] * forward[0] + delta[1] * forward[1], delta[0] * up[0] + delta[1] * up[1]]; };
  const head = relative(native.head.center), bill = relative(native.bill[1]);
  near(head[0], .85); near(head[1], .64); near(bill[0] - head[0], model.head / 100 + .4); near(bill[1] - head[1], 0);
  const base = average(native.tail[0], native.tail[3]), tip = average(native.tail[1], native.tail[2]);
  const baseLocal = relative(base), tipLocal = relative(tip), axis = tipLocal.map((value, index) => value - baseLocal[index]);
  const tailErrors = [average(native.errors.tail[0], native.errors.tail[3]), average(native.errors.tail[1], native.errors.tail[2])];
  near(baseLocal[0], -.75); near(baseLocal[1], -.15); near(distance(base, tip), 118.75, precision(distanceError(...tailErrors)));
  // Reconstruct relative tail direction from the polygon's two centerlines.
  // A page turn rotates the body and tail together, leaving these dot products.
  near(axis[0] / 1.25, -Math.cos(model.tail * Math.PI / 180)); near(axis[1] / 1.25, Math.sin(model.tail * Math.PI / 180));
  near(distance(native.tail[0], native.tail[3]), 19, precision(distanceError(native.errors.tail[0], native.errors.tail[3]))); near(distance(native.tail[1], native.tail[2]), 26.6, precision(distanceError(native.errors.tail[1], native.errors.tail[2])));
  const measuredLandmarks = landmarks(native);
  expect(native.selected).toEqual([landmark]);
  for (const name of Object.keys(measuredLandmarks)) sameNative(native.anchors[name], measuredLandmarks[name], native.errors.anchors[name], landmarkErrors(native)[name]);
  near(native.readings.ratio, headDiameter / bodyLength * 100); near(native.readings.length, distance(base, tip) / 95, precision(distanceError(...tailErrors) / 95));
  near(native.readings.x, (measuredLandmarks[landmark][0] - 330) / 95, .00501); near(native.readings.y, (270 - measuredLandmarks[landmark][1]) / 95, .00501);
  if (!guides) { expect(native.rulers).toEqual({ body: null, head: null, tail: null }); return; }
  for (const kind of ['body', 'head', 'tail']) {
    const expected = kind === 'body' ? native.body.major : kind === 'head' ? native.head.diameter : [base, tip];
    const expectedErrors = kind === 'body' ? native.errors.body.major : kind === 'head' ? native.errors.head.diameter : tailErrors;
    sameNative(native.rulers[kind], expected, native.errors.rulers[kind], expectedErrors);
  }
}
async function check(page: Page, model: Model, key = 'current', landmark = 'head', guides = true) {
  // React's updated transform attribute can precede Blink's rendered CTM.
  // Wait for the actual body axis and selected landmark, then run the full
  // independent oracle with its original length/angle tolerances.
  await expect.poll(async () => { const native = await drawing(page, key), length = distance(...native.body.major), direction = native.body.major[1].map((value: number, axis: number) => (value - native.body.major[0][axis]) / length); return { painted: Math.abs(direction[0] - Math.cos(model.turn * Math.PI / 180)) < 1e-5 && Math.abs(direction[1] + Math.sin(model.turn * Math.PI / 180)) < 1e-5, selected: native.selected }; }).toEqual({ painted: true, selected: [landmark] });
  verify(await drawing(page, key), model, landmark, guides);
}

test('actual native bird forms distinguish rigid page rotation from head proportion and relative tail changes on fixed equal axes', async ({ page }) => {
  await mount(page); await check(page, defaults);
  for (const model of [{ turn: -30, head: 25, tail: -30 }, { turn: 60, head: 50, tail: 45 }, { turn: 30, head: 45, tail: 0 }, defaults]) {
    await settings(page, model); await check(page, model);
  }
  const before = await drawing(page);
  await settings(page, { ...defaults, turn: 45 }); await check(page, { ...defaults, turn: 45 });
  const after = await drawing(page), keys = ['body', 'head', 'bill', 'tail'];
  // Pairwise distances between actual shape-derived landmarks establish a
  // rigid turn independently of the displayed ratios or transform strings.
  for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) near(distance(landmarks(before)[keys[i]], landmarks(before)[keys[j]]), distance(landmarks(after)[keys[i]], landmarks(after)[keys[j]]), precision(distanceError(landmarkErrors(before)[keys[i]], landmarkErrors(before)[keys[j]]) + distanceError(landmarkErrors(after)[keys[i]], landmarkErrors(after)[keys[j]])));
  expect(landmarks(after).tail).not.toEqual(landmarks(before).tail);
  await settings(page, { ...defaults, head: 50 }); await check(page, { ...defaults, head: 50 }); const bigger = await drawing(page);
  for (const name of ['body', 'head', 'tail']) sameNative(landmarks(bigger)[name], landmarks(before)[name], landmarkErrors(bigger)[name], landmarkErrors(before)[name]);
  expect(landmarks(bigger).bill).not.toEqual(landmarks(before).bill);
  await page.locator('[data-sketch-hotspot="current:tail"] circle:last-of-type').tap(); await expect(page.locator('[data-sketch-select="tail"]')).toHaveAttribute('aria-pressed', 'true');
  await check(page, { ...defaults, head: 50 }, 'current', 'tail');
  const visible = await drawing(page); await page.locator('[data-sketch-guides]').uncheck(); const hidden = await drawing(page);
  for (const part of ['body', 'head', 'tail', 'bill', 'anchors']) sameNative(hidden[part], visible[part], hidden.errors[part], visible.errors[part]);
  await check(page, { ...defaults, head: 50 }, 'current', 'tail', false);
  // All previous construction/detail/posture/journal/color reference content
  // remains available alongside the new studio.
  for (const title of ['Quick sketches', 'Adding details', 'Drawing posture + behavior', 'Note-taking', 'Color']) await expect(page.getByRole('heading', { level: 2 }).filter({ hasText: title })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2 }).filter({ hasText: 'Quick sketches' }).locator('..').locator('svg[viewBox="0 0 150 148"]')).toHaveCount(4);
  await expect(page.getByRole('heading', { level: 2 }).filter({ hasText: 'Note-taking' }).locator('..').locator('svg[viewBox="0 0 150 148"]')).toHaveCount(1);
  await expect(page.locator('svg[viewBox="0 0 156 152"]')).toHaveCount(1);
  await expect(page.locator('svg[viewBox="0 0 110 110"]')).toHaveCount(3);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('full frozen construction and bounded exact changes preserve shared inspection and host continuity without awarding progress', async ({ page }) => {
  await mount(page); const progress = await page.evaluate(() => JSON.stringify((window as any).__toolData.birdLab));
  await page.locator('[data-sketch-pin]').click(); await check(page, defaults, 'pinned'); const frozen = await drawing(page, 'pinned');
  await settings(page, { turn: -25, head: 50, tail: -30 }); await page.locator('[data-sketch-select="bill"]').click(); await page.locator('[data-sketch-guides]').uncheck();
  expect(await physical(page, 'pinned')).toEqual(defaults);
  for (const [kind, expected] of [['turn', { ...defaults, turn: 45 }], ['head', { ...defaults, head: 40 }], ['tail', { ...defaults, tail: 45 }]] as const) {
    await page.locator('[data-sketch-experiment="' + kind + '"]').click(); expect(await physical(page)).toEqual(expected);
    await check(page, expected, 'current', 'bill', false); await check(page, defaults, 'pinned', 'bill', false);
  }
  await page.locator('[data-sketch-guides]').check();
  const pinAfter = await drawing(page, 'pinned'); for (const key of ['body', 'head', 'tail', 'bill', 'anchors', 'rulers']) sameNative(pinAfter[key], frozen[key], pinAfter.errors[key], frozen.errors[key]);
  await page.evaluate(() => (window as any).__ctx.update('birdLab', 'blXp', 17));
  await expect.poll(() => page.evaluate(() => (window as any).__toolData.birdLab.blXp)).toBe(17);
  expect(await physical(page)).toEqual({ ...defaults, tail: 45 }); expect(await physical(page, 'pinned')).toEqual(defaults);
  await expect(page.locator('[data-sketch-select="bill"]')).toHaveAttribute('aria-pressed', 'true'); await expect(page.locator('[data-sketch-guides]')).toBeChecked();
  await settings(page, { turn: 30, head: 45, tail: 15 }); await page.locator('[data-sketch-pin]').click();
  for (const kind of ['turn', 'head', 'tail']) await expect(page.locator('[data-sketch-experiment="' + kind + '"]')).toBeEnabled();
  for (const [kind, expected] of [['turn', { turn: 60, head: 45, tail: 15 }], ['head', { turn: 30, head: 50, tail: 15 }], ['tail', { turn: 30, head: 45, tail: 45 }]] as const) {
    await page.locator('[data-sketch-experiment="' + kind + '"]').click(); expect(await physical(page)).toEqual(expected); await check(page, expected, 'current', 'bill');
  }
  await settings(page, { turn: 60, head: 50, tail: 45 }); await page.locator('[data-sketch-pin]').click();
  for (const kind of ['turn', 'head', 'tail']) await expect(page.locator('[data-sketch-experiment="' + kind + '"]')).toBeDisabled();
  await page.locator('[data-sketch-answer="ratio"]').click(); await expect(page.locator('.birdlab-sketch-feedback')).toContainText('not the foreshortening');
  await page.locator('[data-sketch-answer="rigid"]').click(); await expect(page.locator('.birdlab-sketch-feedback')).toContainText('preserving lengths');
  await page.locator('[data-sketch-reset]').click(); expect(await physical(page)).toEqual(defaults); expect(await physical(page, 'pinned')).toEqual({ turn: 60, head: 50, tail: 45 });
  await expect(page.locator('.birdlab-sketch-feedback')).toHaveCount(0); await expect(page.locator('[data-sketch-select="bill"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-sketch-clear]').click(); await expect(page.locator('[data-sketch-select="bill"]')).toBeFocused(); await expect(page.locator(condition('pinned'))).toHaveCount(0);
  expect(await page.evaluate(() => JSON.stringify({ ...(window as any).__toolData.birdLab, blXp: 0 }))).toBe(progress);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('sketch landmarks, full comparisons and native text remain keyboard and touch readable at desktop, phone and embedded widths', async ({ page }) => {
  await mount(page);
  for (const layout of [{ viewport: 1280, host: 1100 }, { viewport: 390, host: 390 }, { viewport: 1280, host: 500 }]) {
    await sizing(page, layout.viewport, layout.host); await page.locator('[data-sketch-reset]').click(); await page.locator('[data-sketch-guides]').check(); await page.locator('[data-sketch-pin]').click();
    const turn = page.locator('#birdlab-sketch-turn'); await turn.focus(); await page.keyboard.press('ArrowRight'); await expect(turn).toBeFocused(); await expect(turn).toHaveValue('20');
    const hotspot = page.locator('[data-sketch-hotspot="current:tail"]'); await hotspot.focus(); await page.keyboard.press('Space'); await expect(hotspot).toBeFocused();
    await expect(page.locator('[data-sketch-select="tail"]')).toHaveAttribute('aria-pressed', 'true');
    const experiment = page.locator('[data-sketch-experiment="turn"]'); await experiment.focus(); await page.keyboard.press('Enter'); await expect(experiment).toBeFocused();
    await check(page, { ...defaults, turn: 45 }, 'current', 'tail'); await check(page, defaults, 'pinned', 'tail');
    await page.locator('[data-sketch-select="head"]').tap(); await expect(page.locator('[data-sketch-select="head"]')).toHaveAttribute('aria-pressed', 'true');
    const answer = page.locator('[data-sketch-answer="rigid"]'); await answer.focus(); await page.keyboard.press('Enter'); await expect(answer).toBeFocused();
    const host = (await page.locator('#wrap').boundingBox())!;
    for (const selector of [root, '.birdlab-sketch-controls', '.birdlab-sketch-compare', condition(), condition('pinned'), '.birdlab-sketch-note']) {
      const node = page.locator(selector), box = (await node.boundingBox())!;
      expect(box.x, selector).toBeGreaterThanOrEqual(host.x - 1); expect(box.x + box.width, selector).toBeLessThanOrEqual(host.x + host.width + 1);
      expect(await node.evaluate(element => element.scrollWidth - element.clientWidth), selector).toBeLessThanOrEqual(1);
    }
    const widths = await page.locator(root + ' [data-sketch-map]').evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().width)); near(widths[0], widths[1], 1);
    for (const node of await page.locator('[data-sketch-select]').all()) { const box = (await node.boundingBox())!; expect(box.height).toBeGreaterThanOrEqual(44); expect(box.width).toBeGreaterThanOrEqual(44); }
    const bounds = await page.locator(root + ' svg text').evaluateAll(nodes => nodes.map(node => { const text = node as SVGTextElement, box = text.getBBox(), svg = text.ownerSVGElement!, matrix = text.getScreenCTM()!; return { text: text.textContent, x: box.x, top: box.y, right: box.x + box.width, bottom: box.y + box.height, width: svg.viewBox.baseVal.width, height: svg.viewBox.baseVal.height, font: parseFloat(getComputedStyle(text).fontSize) * Math.hypot(matrix.a, matrix.b) }; }));
    for (const box of bounds) { expect(box.x, box.text!).toBeGreaterThanOrEqual(0); expect(box.right, box.text!).toBeLessThanOrEqual(box.width); expect(box.top, box.text!).toBeGreaterThanOrEqual(0); expect(box.bottom, box.text!).toBeLessThanOrEqual(box.height); expect(box.font, box.text!).toBeGreaterThanOrEqual(11); }
    const violations = await page.evaluate(async () => { const result = await (window as any).axe.run(document.querySelector('[data-birdlab-sketch-study]'), { runOnly: { type: 'rule', values: ['color-contrast', 'button-name', 'select-name', 'label', 'aria-valid-attr-value', 'aria-required-children', 'aria-required-parent', 'nested-interactive'] } }); return result.violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) })); });
    expect(violations).toEqual([]); expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.locator('[data-sketch-clear]').click(); await expect(page.locator('[data-sketch-select="head"]')).toBeFocused();
  }
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
