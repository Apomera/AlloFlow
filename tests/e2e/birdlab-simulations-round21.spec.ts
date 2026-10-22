import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off', hasTouch: true });
test.describe.configure({ retries: 0, timeout: 180_000 });
const harness = new GlHarness({ toolId: 'birdLab', toolFile: 'stem_lab/stem_tool_birdlab.js', preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'], width: 1100, height: 1000, appStyles: true, layout: 'document' });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));
type Model = { speed: number; course: number; wx: number; wy: number };
const defaults: Model = { speed: 3, course: 90, wx: 2, wy: 0 }, root = '[data-birdlab-wind-study]';
const near = (actual: number, expected: number, bound = 0) => expect(Math.abs(actual - expected)).toBeLessThan(Math.max(1e-5, bound + 1e-8));
const norm = (value: number[]) => Math.hypot(value[0], value[1]);
const pointNear = (actual: number[], expected: number[], aError = [0, 0], bError = [0, 0]) => { for (let axis = 0; axis < 2; axis++) near(actual[axis], expected[axis], aError[axis] + bError[axis]); };
async function sizing(page: Page, viewport: number, host: number) {
  await page.setViewportSize({ width: viewport, height: 1000 });
  await page.locator('#wrap').evaluate((node: HTMLElement, width) => { node.style.width = width + 'px'; node.style.maxWidth = '100%'; node.setAttribute('data-stem-tool-shell', 'true'); }, host);
}
async function mount(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { birdLab: { view: 'weather', blXp: 0, blLifeList: {}, blBadges: {} } }, undefined, { expectCanvas: false });
  await sizing(page, 1280, 1100); await expect(page.locator(root)).toBeVisible();
}
async function physical(page: Page, key = 'current'): Promise<Model> { return page.locator('[data-wind-condition="' + key + '"]').evaluate(node => Object.fromEntries(['speed', 'course', 'wx', 'wy'].map(name => [name, Number(node.getAttribute('data-wind-' + name))])) as Model); }
async function settings(page: Page, model: Model) { for (const [name, value] of Object.entries(model)) await page.locator('#birdlab-wind-' + name).fill(String(value)); await expect.poll(() => physical(page)).toEqual(model); }
function oracle(model: Model, time: number) {
  const radians = model.course * Math.PI / 180, air = [model.speed * Math.cos(radians), model.speed * Math.sin(radians)].map(n => Math.abs(n) < 1e-10 ? 0 : n), wind = [model.wx, model.wy], ground = air.map((n, axis) => n + wind[axis]);
  return { air, wind, ground, position: ground.map(n => n * time), stillair: air.map(n => n * time), offset: wind.map(n => n * time), speed: norm(ground) };
}
// Native SVG numbers can accumulate Float32 decimal-parse error beyond one
// half-ULP. Measure raw-attribute -> native-value deltas, propagate through the
// actual CTM, and keep these parse-only bounds separate from the model oracle.
async function drawing(page: Page, key = 'current'): Promise<any> {
  return page.locator('[data-wind-condition="' + key + '"]').evaluate((element, name) => {
    const velocity = element.querySelector('[data-wind-velocity-map]') as SVGSVGElement, ground = element.querySelector('[data-wind-ground-map]') as SVGSVGElement;
    const inputError = (actual: number, source: number) => Math.abs(actual - source) + 4 * Number.EPSILON * Math.max(1, Math.abs(source));
    function matrix(node: SVGGraphicsElement, svg: SVGSVGElement) { return svg.getScreenCTM()!.inverse().multiply(node.getScreenCTM()!); }
    function point(node: SVGGraphicsElement, svg: SVGSVGElement, x: number, y: number) { const p = new DOMPoint(x, y).matrixTransform(matrix(node, svg)); return [p.x, p.y]; }
    function error(node: SVGGraphicsElement, svg: SVGSVGElement, ex: number, ey: number) { const m = matrix(node, svg); return [Math.abs(m.a) * ex + Math.abs(m.c) * ey, Math.abs(m.b) * ex + Math.abs(m.d) * ey]; }
    function lengthError(node: SVGGraphicsElement, attr: string) { return inputError((node as any)[attr].baseVal.value, Number(node.getAttribute(attr))); }
    function line(node: SVGLineElement | null, svg: SVGSVGElement) {
      if (!node) return null;
      return { points: [point(node, svg, node.x1.baseVal.value, node.y1.baseVal.value), point(node, svg, node.x2.baseVal.value, node.y2.baseVal.value)], errors: [error(node, svg, lengthError(node, 'x1'), lengthError(node, 'y1')), error(node, svg, lengthError(node, 'x2'), lengthError(node, 'y2'))] };
    }
    function circle(node: SVGCircleElement, svg: SVGSVGElement) { return { point: point(node, svg, node.cx.baseVal.value, node.cy.baseVal.value), error: error(node, svg, lengthError(node, 'cx'), lengthError(node, 'cy')) }; }
    const flyer = ground.querySelector('[data-wind-flyer]') as SVGGElement, source = flyer.getAttribute('transform')!.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi)!.map(Number), translation = flyer.transform.baseVal.getItem(0).matrix;
    return { views: [velocity.getAttribute('viewBox'), ground.getAttribute('viewBox')],
      vectors: Object.fromEntries(['air', 'wind', 'ground', 'wind-origin'].map(kind => [kind, line(velocity.querySelector('[data-wind-vector="' + name + ':' + kind + '"]'), velocity)])),
      map: Object.fromEntries(['travel', 'stillair', 'offset', 'full-path'].map(kind => [kind, line(ground.querySelector('[data-wind-' + kind + '="' + name + '"]'), ground)])),
      stillair: circle(ground.querySelector('[data-wind-stillair-point]') as SVGCircleElement, ground),
      grip: name === 'current' ? circle(velocity.querySelector('[data-wind-grip]') as SVGCircleElement, velocity) : null,
      flyer: { center: point(flyer, ground, 0, 0), facing: point(flyer, ground, 1, 0), error: [inputError(translation.e, source[0]), inputError(translation.f, source[1])] },
      readings: Object.fromEntries(['groundSpeed', 'direction', 'x', 'y', 'offset'].map(kind => [kind, element.querySelector('[data-wind-value="' + name + ':' + kind + '"]')!.textContent!])) };
  }, key);
}
function displacement(line: any, scale: number) { return { vector: line.points[1].map((n: number, axis: number) => (n - line.points[0][axis]) / (axis ? -scale : scale)), error: line.errors[1].map((n: number, axis: number) => (n + line.errors[0][axis]) / scale) }; }
function verify(d: any, model: Model, time: number, guides = true) {
  const expected = oracle(model, time); expect(d.views).toEqual(['0 0 640 610', '0 0 640 610']);
  const vectors = Object.fromEntries(['air', 'wind', 'ground'].map(kind => [kind, displacement(d.vectors[kind], 25)]));
  for (const kind of ['air', 'wind', 'ground'] as const) pointNear(vectors[kind].vector, expected[kind], vectors[kind].error);
  pointNear(d.vectors.air.points[0], [320, 310], d.vectors.air.errors[0]); pointNear(d.vectors.ground.points[0], [320, 310], d.vectors.ground.errors[0]);
  pointNear(d.vectors.wind.points[0], d.vectors.air.points[1], d.vectors.wind.errors[0], d.vectors.air.errors[1]);
  pointNear(d.vectors.wind.points[1], d.vectors.ground.points[1], d.vectors.wind.errors[1], d.vectors.ground.errors[1]);
  // Vector closure is established independently from three actual SVG lines.
  pointNear(vectors.ground.vector, vectors.air.vector.map((n: number, axis: number) => n + vectors.wind.vector[axis]), vectors.ground.error, vectors.air.error.map((n: number, axis: number) => n + vectors.wind.error[axis]));
  if (d.grip) pointNear(d.grip.point, d.vectors.ground.points[1], d.grip.error, d.vectors.ground.errors[1]);
  const traveled = displacement(d.map.travel, 6.25), stillair = displacement(d.map.stillair, 6.25);
  pointNear(traveled.vector, expected.position, traveled.error); pointNear(stillair.vector, expected.stillair, stillair.error);
  pointNear(d.map.travel.points[0], [320, 310], d.map.travel.errors[0]); pointNear(d.map.stillair.points[0], [320, 310], d.map.stillair.errors[0]);
  pointNear(d.flyer.center, d.map.travel.points[1], d.flyer.error, d.map.travel.errors[1]); pointNear(d.stillair.point, d.map.stillair.points[1], d.stillair.error, d.map.stillair.errors[1]);
  const facing = d.flyer.facing.map((n: number, axis: number) => n - d.flyer.center[axis]); near(facing[0], Math.cos(model.course * Math.PI / 180)); near(facing[1], -Math.sin(model.course * Math.PI / 180));
  const diagonal = d.flyer.center.map((n: number, axis: number) => (n - d.stillair.point[axis]) / (axis ? -6.25 : 6.25)), diagonalError = d.flyer.error.map((n: number, axis: number) => (n + d.stillair.error[axis]) / 6.25);
  pointNear(diagonal, expected.offset, diagonalError);
  near(parseFloat(d.readings.groundSpeed), norm(vectors.ground.vector), .00501); near(parseFloat(d.readings.x), traveled.vector[0], .00501); near(parseFloat(d.readings.y), traveled.vector[1], .00501); near(parseFloat(d.readings.offset), norm(diagonal), .00501);
  if (expected.speed < 1e-9) expect(d.readings.direction).toBe('Undefined · zero velocity'); else {
    // Native screen-Y inversion can produce -0, making atan2(-0, -X) = -180°
    // while the runtime prints +180°. Compare the same direction on a circle.
    const difference = (parseFloat(d.readings.direction) - Math.atan2(vectors.ground.vector[1], vectors.ground.vector[0]) * 180 / Math.PI) * Math.PI / 180;
    near(Math.atan2(Math.sin(difference), Math.cos(difference)) * 180 / Math.PI, 0, .00501);
  }
  if (!guides) { expect(d.vectors['wind-origin']).toBeNull(); expect(d.map.offset).toBeNull(); expect(d.map['full-path']).toBeNull(); return; }
  pointNear(displacement(d.vectors['wind-origin'], 25).vector, expected.wind, displacement(d.vectors['wind-origin'], 25).error);
  pointNear(displacement(d.map.offset, 6.25).vector, expected.offset, displacement(d.map.offset, 6.25).error);
  pointNear(displacement(d.map['full-path'], 6.25).vector, expected.ground.map(n => n * 4), displacement(d.map['full-path'], 6.25).error);
}
async function check(page: Page, model: Model, time: number, key = 'current', guides = true) {
  // A React attribute update may precede Blink's rendered SVG matrices.
  await expect.poll(async () => { const d = await drawing(page, key), expected = oracle(model, time), position = d.flyer.center.map((n: number, axis: number) => (n - [320, 310][axis]) / 6.25), facing = d.flyer.facing.map((n: number, axis: number) => n - d.flyer.center[axis]); return Math.abs(position[0] - expected.position[0]) < 1e-4 && Math.abs(position[1] + expected.position[1]) < 1e-4 && Math.abs(facing[0] - Math.cos(model.course * Math.PI / 180)) < 1e-5 && Math.abs(facing[1] + Math.sin(model.course * Math.PI / 180)) < 1e-5; }).toBe(true);
  verify(await drawing(page, key), model, time, guides);
}
async function dragTo(page: Page, wx: number, wy: number) {
  const svg = page.locator('[data-wind-velocity-map="current"]'); await svg.scrollIntoViewIfNeeded();
  const points = await svg.evaluate((element, desired) => { const svg = element as SVGSVGElement, air = svg.querySelector('[data-wind-vector="current:air"]') as SVGLineElement, grip = svg.querySelector('[data-wind-grip]') as SVGCircleElement; const start = new DOMPoint(grip.cx.baseVal.value, grip.cy.baseVal.value).matrixTransform(svg.getScreenCTM()!), end = new DOMPoint(air.x2.baseVal.value + desired[0] * 25, air.y2.baseVal.value - desired[1] * 25).matrixTransform(svg.getScreenCTM()!); return { start: [start.x, start.y], end: [end.x, end.y] }; }, [wx, wy]);
  await page.mouse.move(points.start[0], points.start[1]); await page.mouse.down(); await page.mouse.move(points.end[0], points.end[1], { steps: 5 }); await page.mouse.up();
}

test('native velocity closure, displacement, bird orientation and bounded drag distinguish air course from ground track including zero and reversed ground motion', async ({ page }) => {
  await mount(page); await check(page, defaults, 2);
  for (const model of [{ speed: 6, course: 45, wx: 3, wy: -3 }, { speed: 1, course: -180, wx: -3, wy: 3 }, { speed: 3, course: 0, wx: -3, wy: 0 }, { speed: 1, course: 0, wx: -3, wy: 0 }, { speed: 3, course: -90, wx: 0, wy: 3 }]) {
    await settings(page, model); for (const time of [0, 1.25, 4]) { await page.locator('#birdlab-wind-time').fill(String(time)); await check(page, model, time); }
  }
  await settings(page, defaults); await page.locator('#birdlab-wind-time').fill('2'); await check(page, defaults, 2);
  await dragTo(page, 1.5, -1); await expect.poll(() => physical(page)).toEqual({ ...defaults, wx: 1.5, wy: -1 }); await check(page, { ...defaults, wx: 1.5, wy: -1 }, 2);
  await dragTo(page, 4.25, -4.25); await expect.poll(() => physical(page)).toEqual({ ...defaults, wx: 3, wy: -3 }); await check(page, { ...defaults, wx: 3, wy: -3 }, 2);
  await expect(page.locator('[data-wind-nudge="x+"]')).toBeDisabled(); await expect(page.locator('[data-wind-nudge="y-"]')).toBeDisabled();
  await page.locator('[data-wind-guides]').uncheck(); await check(page, { ...defaults, wx: 3, wy: -3 }, 2, 'current', false);
  await expect(page.locator('svg[viewBox="0 0 600 330"]')).toHaveCount(1); expect(await page.locator('[data-wx-wind]').count()).toBeGreaterThan(0);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('complete frozen velocities, exact bounded changes and shared time survive examples and unrelated host writes without progress awards', async ({ page }) => {
  await mount(page); const progress = await page.evaluate(() => JSON.stringify((window as any).__toolData.birdLab)); await page.locator('[data-wind-pin]').click();
  await settings(page, { speed: 5.5, course: -125, wx: -.5, wy: 2.5 }); await page.locator('#birdlab-wind-time').fill('3.25'); await page.locator('[data-wind-guides]').uncheck();
  for (const [kind, expected] of [['reverse', { ...defaults, wx: -2 }], ['calm', { ...defaults, wx: 0 }], ['speed', { ...defaults, speed: 6 }]] as const) {
    await page.locator('[data-wind-experiment="' + kind + '"]').click(); await expect.poll(() => physical(page)).toEqual(expected); expect(await physical(page, 'pinned')).toEqual(defaults);
    await check(page, expected, 3.25, 'current', false); await check(page, defaults, 3.25, 'pinned', false);
  }
  await page.locator('[data-wind-preset="cancel"]').click(); expect(await physical(page)).toEqual({ speed: 3, course: 0, wx: -3, wy: 0 }); await check(page, { speed: 3, course: 0, wx: -3, wy: 0 }, 3.25, 'current', false);
  await page.locator('[data-wind-preset="reverse"]').click(); await check(page, { speed: 1, course: 0, wx: -3, wy: 0 }, 3.25, 'current', false);
  await page.evaluate(() => (window as any).__ctx.update('birdLab', 'blXp', 17)); await expect.poll(() => page.evaluate(() => (window as any).__toolData.birdLab.blXp)).toBe(17);
  expect(await physical(page)).toEqual({ speed: 1, course: 0, wx: -3, wy: 0 }); expect(await physical(page, 'pinned')).toEqual(defaults); await expect(page.locator('#birdlab-wind-time')).toHaveValue('3.25'); await expect(page.locator('[data-wind-guides]')).not.toBeChecked();
  await settings(page, { speed: 3.5, course: 180, wx: 0, wy: 0 }); await page.locator('[data-wind-pin]').click(); for (const kind of ['calm', 'reverse', 'speed']) await expect(page.locator('[data-wind-experiment="' + kind + '"]')).toBeDisabled();
  await page.locator('[data-wind-answer="same"]').click(); await expect(page.locator('.birdlab-wind-feedback')).toContainText('need not match'); await page.locator('[data-wind-answer="vector"]').click(); await expect(page.locator('.birdlab-wind-feedback')).toContainText('undefined');
  await page.locator('[data-wind-reset]').click(); expect(await physical(page)).toEqual(defaults); expect(await physical(page, 'pinned')).toEqual({ speed: 3.5, course: 180, wx: 0, wy: 0 }); await expect(page.locator('#birdlab-wind-time')).toHaveValue('3.25'); await expect(page.locator('[data-wind-guides]')).not.toBeChecked(); await expect(page.locator('.birdlab-wind-feedback')).toHaveCount(0);
  await page.locator('[data-wind-clear]').click(); await expect(page.locator('#birdlab-wind-time')).toBeFocused(); await expect(page.locator('[data-wind-condition="pinned"]')).toHaveCount(0);
  expect(await page.evaluate(() => JSON.stringify({ ...(window as any).__toolData.birdLab, blXp: 0 }))).toBe(progress); expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('wind handle, native controls and frozen diagrams remain keyboard and touch readable with eight accessibility rules at three host widths', async ({ page }) => {
  await mount(page);
  for (const layout of [{ viewport: 1280, host: 1100 }, { viewport: 390, host: 390 }, { viewport: 1280, host: 500 }]) {
    await sizing(page, layout.viewport, layout.host); await page.locator('[data-wind-reset]').click(); await page.locator('#birdlab-wind-time').fill('2'); await page.locator('[data-wind-guides]').check(); await page.locator('[data-wind-pin]').click();
    const course = page.locator('#birdlab-wind-course'); await course.focus(); await page.keyboard.press('ArrowRight'); await expect(course).toBeFocused(); await expect(course).toHaveValue('95');
    const handle = page.locator('[data-wind-handle]'); await handle.focus(); await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowUp'); await expect(handle).toBeFocused(); await expect.poll(() => physical(page)).toEqual({ ...defaults, course: 95, wx: 2.5, wy: .5 }); await check(page, { ...defaults, course: 95, wx: 2.5, wy: .5 }, 2);
    await page.keyboard.press('Home'); await expect(handle).toBeFocused(); await expect.poll(() => physical(page)).toEqual({ ...defaults, course: 95, wx: 0, wy: 0 });
    await page.locator('[data-wind-nudge="x+"]').tap(); await page.locator('[data-wind-nudge="y-"]').tap(); await check(page, { ...defaults, course: 95, wx: .5, wy: -.5 }, 2);
    const experiment = page.locator('[data-wind-experiment="reverse"]'); await experiment.focus(); await page.keyboard.press('Enter'); await expect(experiment).toBeFocused(); await check(page, { ...defaults, wx: -2 }, 2); await check(page, defaults, 2, 'pinned');
    const answer = page.locator('[data-wind-answer="vector"]'); await answer.focus(); await page.keyboard.press('Enter'); await expect(answer).toBeFocused();
    const host = (await page.locator('#wrap').boundingBox())!;
    for (const selector of [root, '.birdlab-wind-controls', '.birdlab-wind-compare', '[data-wind-condition="current"]', '[data-wind-condition="pinned"]', '.birdlab-wind-notes']) { const node = page.locator(selector), box = (await node.boundingBox())!; expect(box.x, selector).toBeGreaterThanOrEqual(host.x - 1); expect(box.x + box.width, selector).toBeLessThanOrEqual(host.x + host.width + 1); expect(await node.evaluate(n => n.scrollWidth - n.clientWidth), selector).toBeLessThanOrEqual(1); }
    for (const kind of ['velocity', 'ground']) { const widths = await page.locator('[data-wind-' + kind + '-map]').evaluateAll(nodes => nodes.map(n => n.getBoundingClientRect().width)); near(widths[0], widths[1], 1); }
    for (const node of await page.locator('[data-wind-nudge]').all()) { const box = (await node.boundingBox())!; expect(box.width).toBeGreaterThanOrEqual(44); expect(box.height).toBeGreaterThanOrEqual(44); }
    const bounds = await page.locator(root + ' svg text').evaluateAll(nodes => nodes.map(node => { const text = node as SVGTextElement, box = text.getBBox(), svg = text.ownerSVGElement!, matrix = text.getScreenCTM()!; return { text: text.textContent, left: box.x, top: box.y, right: box.x + box.width, bottom: box.y + box.height, width: svg.viewBox.baseVal.width, height: svg.viewBox.baseVal.height, font: parseFloat(getComputedStyle(text).fontSize) * Math.hypot(matrix.a, matrix.b) }; }));
    for (const box of bounds) { expect(box.left, box.text!).toBeGreaterThanOrEqual(0); expect(box.top, box.text!).toBeGreaterThanOrEqual(0); expect(box.right, box.text!).toBeLessThanOrEqual(box.width); expect(box.bottom, box.text!).toBeLessThanOrEqual(box.height); expect(box.font, box.text!).toBeGreaterThanOrEqual(11); }
    const grids = await page.locator(root + ' [data-wind-grid]').evaluateAll(nodes => nodes.map(node => ({ name: node.getAttribute('data-wind-grid')!, lines: node.querySelectorAll('line').length, labels: Array.from(node.querySelectorAll('text')).map(node => { const text = node as SVGTextElement, box = text.getBBox(); return { text: text.textContent!, left: box.x, top: box.y, right: box.x + box.width, bottom: box.y + box.height }; }) })));
    for (const grid of grids) {
      // Keep all five gridlines per axis and every other label; only the ground
      // map's redundant lower-left Y-minimum label is omitted for readability.
      expect(grid.lines, grid.name).toBe(10); expect(grid.labels.length, grid.name).toBe(grid.name.endsWith(':ground') ? 10 : 11);
      if (grid.name.endsWith(':ground')) expect(grid.labels.filter(label => label.text === '-40')).toHaveLength(1);
      for (let i = 0; i < grid.labels.length; i++) for (let j = i + 1; j < grid.labels.length; j++) {
        const a = grid.labels[i], b = grid.labels[j], overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left), overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        expect(overlapX <= 0 || overlapY <= 0, grid.name + ': ' + a.text + ' / ' + b.text).toBe(true);
      }
    }
    const violations = await page.evaluate(async () => { const result = await (window as any).axe.run(document.querySelector('[data-birdlab-wind-study]'), { runOnly: { type: 'rule', values: ['color-contrast', 'button-name', 'select-name', 'label', 'aria-valid-attr-value', 'aria-required-children', 'aria-required-parent', 'nested-interactive'] } }); return result.violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) })); });
    expect(violations).toEqual([]); expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1); await page.locator('[data-wind-clear]').click(); await expect(page.locator('#birdlab-wind-time')).toBeFocused();
  }
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
