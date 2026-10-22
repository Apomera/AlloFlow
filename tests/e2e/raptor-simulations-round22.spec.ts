import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off', hasTouch: true });
test.describe.configure({ timeout: 180_000, retries: 0 });
const harness = new GlHarness({ toolId: 'raptorHunt', toolFile: 'stem_lab/stem_tool_raptorhunt.js', width: 1100, height: 1000,
  layout: 'document', appStyles: true, extraScripts: ['node_modules/axe-core/axe.min.js'] });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

type Model = { version: number; values: number[]; selected: number };
type Scalar = { native: number; decimal: number };
const defaults = [6, 8, 9, 10, 11, 12, 14], initial: Model = { version: 1, values: defaults, selected: 6 };
const root = '[data-raptor-summary-study]', current = '[data-summary-condition="current"]';
async function mount(page: Page, summaryStudy?: any) {
  await page.setViewportSize({ width: 1280, height: 1000 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { raptorHunt: { activeSection: 'datatables', summaryStudy, xp: 0 } }, undefined, { expectCanvas: false });
  await expect(page.locator(root)).toBeVisible();
}
async function replace(page: Page, model: any) {
  await page.evaluate(value => (window as any).__ctx.setToolData((old: any) => ({ ...old, raptorHunt: { ...old.raptorHunt, summaryStudy: value } })), model);
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}
async function values(page: Page, key = 'current') { return (await page.locator('[data-summary-condition="' + key + '"]').getAttribute('data-summary-values'))!.split(',').map(Number); }
async function range(page: Page, value: number) {
  await page.locator('#rh-summary-value').evaluate((node: HTMLInputElement, next) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(node, String(next));
    node.dispatchEvent(new Event('input', { bubbles: true })); node.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
  await expect(page.locator('#rh-summary-value')).toHaveValue(String(value));
  await expect.poll(() => page.locator(current + ' [data-summary-reading="selected"]').textContent()).toBe(String(value));
}
async function select(page: Page, index: number) {
  await page.locator('[data-summary-select="' + index + '"]').click(); await expect(page.locator('[data-summary-select="' + index + '"]')).toHaveAttribute('aria-pressed', 'true');
}
async function drawing(page: Page, key = 'current'): Promise<any> {
  return page.locator('[data-summary-condition="' + key + '"]').evaluate(condition => {
    const board = condition.querySelector('[data-summary-board]')!, order = condition.querySelector('[data-summary-order]')!;
    const scalar = (node: Element, name: string) => ({ native: (node as any)[name].baseVal.value, decimal: Number(node.getAttribute(name)) });
    const list = (node: Element, names: string[]) => names.map(name => scalar(node, name));
    const path = (name: string) => { const node = board.querySelector<SVGPathElement>('[data-summary-' + name + '-marker]')!, decimal = node.getAttribute('d')!.match(/[-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?/gi)!.map(Number), point = node.getPointAtLength(0); return [{ native: point.x, decimal: decimal[0] }, { native: point.y, decimal: decimal[1] }]; };
    return {
      points: [...board.querySelectorAll<SVGCircleElement>('[data-summary-point]')].map(node => ({ id: Number(node.getAttribute('data-summary-point')), point: list(node, ['cx', 'cy']), label: node.parentElement!.querySelector('text')!.textContent })),
      distances: [...board.querySelectorAll<SVGRectElement>('[data-summary-distance]')].map(node => ({ id: Number(node.getAttribute('data-summary-distance')), rect: list(node, ['x', 'y', 'width', 'height']), fill: getComputedStyle(node).fill })),
      mean: list(board.querySelector('[data-summary-mean-line]')!, ['x1', 'y1', 'x2', 'y2']), median: list(board.querySelector('[data-summary-median-line]')!, ['x1', 'y1', 'x2', 'y2']), meanMarker: path('mean'), medianMarker: path('median'),
      meanLane: (() => { const marker = board.querySelector<SVGPathElement>('[data-summary-mean-marker]')!.getBBox(); return { top: marker.y, headers: [...board.querySelectorAll<SVGTextElement>('text')].filter(node => ['Value', 'Δ from mean'].includes(node.textContent || '')).map(node => { const box = node.getBBox(); return { text: node.textContent, bottom: box.y + box.height }; }) }; })(),
      selection: list(board.querySelector('[data-summary-selection]')!, ['cx', 'cy']),
      deltas: [...board.querySelectorAll('[data-summary-delta]')].map(node => node.textContent), shownValues: [...board.querySelectorAll('[data-summary-value]')].map(node => node.textContent),
      ordered: [...order.querySelectorAll('[data-summary-rank]')].map(node => ({ rank: Number(node.getAttribute('data-summary-rank')), id: Number(node.getAttribute('data-summary-rank-id')), value: node.querySelector('[data-summary-rank-value]')!.textContent, point: list(node.querySelector('[data-summary-rank-point]')!, ['cx', 'cy']) })),
      orderSelection: list(order.querySelector('[data-summary-order-selection]')!, ['cx', 'cy']),
      readings: Object.fromEntries([...condition.querySelectorAll('[data-summary-reading]')].map(node => [node.getAttribute('data-summary-reading'), node.textContent])),
    };
  });
}
// Independent finite-data oracle: count a histogram over the authored domain;
// find the fourth cumulative count; assign each identity a rank by counting
// pairwise predecessors. It never sorts or calls the production reducer.
function oracle(readings: number[]) {
  const counts = Array(21).fill(0); readings.forEach(value => counts[value]++);
  let sum = 0, cumulative = 0, median = -1;
  for (let value = 0; value <= 20; value++) { sum += counts[value] * value; cumulative += counts[value]; if (median < 0 && cumulative >= 4) median = value; }
  const numerator = readings.map(value => 7 * value - sum), ranks = readings.map((value, id) => readings.filter((other, otherId) => other < value || other === value && otherId < id).length);
  return { sum, mean: sum / 7, median, numerator, ranks, below: numerator.filter(value => value < 0).reduce((total, value) => total - value, 0) / 7, above: numerator.filter(value => value > 0).reduce((total, value) => total + value, 0) / 7 };
}
// Each SVG coordinate is checked against our oracle twice. Its actual decimal
// attribute stays double precision; its native parse may be Float32. Only the
// observed native/decimal delta is allowed, rather than a blanket tolerance.
function coordinate(value: Scalar, expected: number) { expect(Math.abs(value.decimal - expected)).toBeLessThanOrEqual(1e-8); expect(Math.abs(value.native - expected)).toBeLessThanOrEqual(Math.abs(value.native - value.decimal) + 1e-8); }
function coordinates(actual: Scalar[], expected: number[]) { expect(actual).toHaveLength(expected.length); actual.forEach((value, index) => coordinate(value, expected[index])); }
function signed(value: number) { return value ? (value < 0 ? '−' : '+') + Number(Math.abs(value).toFixed(3)) : '0'; }
function assertNative(actual: any, model: Model) {
  const expected = oracle(model.values); expect(actual.points).toHaveLength(7); expect(actual.distances).toHaveLength(7);
  for (const point of actual.points) { coordinates(point.point, [100 + 20 * model.values[point.id], 130 + 55 * point.id]); expect(point.label).toBe(String(point.id + 1)); }
  for (const bar of actual.distances) {
    const value = model.values[bar.id]; coordinates(bar.rect, [100 + 20 * Math.min(value, expected.mean), 124 + bar.id * 55, 20 * Math.abs(expected.numerator[bar.id]) / 7, 12]);
    expect(bar.fill).toBe(expected.numerator[bar.id] < 0 ? 'rgb(197, 139, 98)' : 'rgb(120, 185, 179)');
  }
  coordinates(actual.mean, [100 + 20 * expected.mean, 98, 100 + 20 * expected.mean, 495]); coordinates(actual.median, [100 + 20 * expected.median, 98, 100 + 20 * expected.median, 495]);
  coordinates(actual.meanMarker, [100 + 20 * expected.mean, 101]); coordinates(actual.medianMarker, [100 + 20 * expected.median, 499]);
  expect(actual.meanLane.headers).toHaveLength(2); for (const header of actual.meanLane.headers) expect(actual.meanLane.top, 'mean marker overlaps ' + header.text).toBeGreaterThanOrEqual(header.bottom);
  coordinates(actual.selection, [100 + 20 * model.values[model.selected], 130 + 55 * model.selected]);
  expect(actual.deltas).toEqual(expected.numerator.map(value => signed(value / 7))); expect(actual.shownValues).toEqual(model.values.map(String));
  expect(actual.ordered).toHaveLength(7); expect(new Set(actual.ordered.map((item: any) => item.id)).size).toBe(7);
  for (const item of actual.ordered) { expect(item.rank).toBe(expected.ranks[item.id]); expect(item.value).toBe(String(model.values[item.id])); coordinates(item.point, [68.5 + item.rank * 83, 94]); }
  coordinates(actual.orderSelection, [68.5 + expected.ranks[model.selected] * 83, 94]);
  for (const name of ['mean', 'below', 'above'] as const) expect(Math.abs(Number(actual.readings[name]) - expected[name])).toBeLessThanOrEqual(.000501);
  expect(Number(actual.readings.median)).toBe(expected.median); expect(Number(actual.readings.sum)).toBe(expected.sum); expect(Number(actual.readings.selected)).toBe(model.values[model.selected]);
  expect(expected.numerator.reduce((a, b) => a + b, 0)).toBe(0); expect(expected.below).toBe(expected.above);
  let below = 0, above = 0, bound = 0;
  for (const bar of actual.distances) { const length = bar.rect[2] as Scalar; if (expected.numerator[bar.id] < 0) below += length.native / 20; else above += length.native / 20; bound += Math.abs(length.native - length.decimal) / 20; }
  expect(Math.abs(below - above)).toBeLessThanOrEqual(bound + 1e-8);
}
async function labels(page: Page) {
  return page.locator(root + ' svg').evaluateAll(nodes => nodes.map(svg => [...svg.querySelectorAll<SVGTextElement>('text')].map(text => {
    const box = text.getBBox(), view = text.ownerSVGElement!.viewBox.baseVal, matrix = text.getScreenCTM()!;
    return { text: text.textContent, left: box.x, right: box.x + box.width, top: box.y, bottom: box.y + box.height, width: view.width, height: view.height, font: parseFloat(getComputedStyle(text).fontSize) * Math.hypot(matrix.a, matrix.b) };
  })));
}
function assertLabels(groups: Awaited<ReturnType<typeof labels>>, minimumFont = 0) {
  const bounds: unknown[] = [], collisions: unknown[] = [];
  groups.forEach((group, diagram) => group.forEach((label, index) => {
    const name = label.text || '';
    for (const [rule, valid, actual, limit] of [
      ['left', label.left >= 0, label.left, 0], ['right', label.right <= label.width, label.right, label.width],
      ['top', label.top >= 0, label.top, 0], ['bottom', label.bottom <= label.height, label.bottom, label.height],
      ['font', label.font >= minimumFont, label.font, minimumFont],
    ] as const) if (!valid) bounds.push({ diagram, index, name, rule, actual, limit });
    for (const other of group.slice(index + 1)) {
      const width = Math.min(label.right, other.right) - Math.max(label.left, other.left), height = Math.min(label.bottom, other.bottom) - Math.max(label.top, other.top);
      if (!(width <= .25 || height <= .25)) collisions.push({ diagram, name, other: other.text, width, height });
    }
  }));
  expect({ bounds, collisions }).toEqual({ bounds: [], collisions: [] });
}
async function touchDrag(page: Page, index: number, target: number) {
  const mark = page.locator(current + ' [data-summary-mark="' + index + '"]'); await mark.scrollIntoViewIfNeeded();
  const points = await mark.evaluate((node, value) => { const svg = (node as SVGGElement).ownerSVGElement!, point = svg.createSVGPoint(), circle = node.querySelector<SVGCircleElement>('[data-summary-point]')!, matrix = svg.getScreenCTM()!; point.x = circle.cx.baseVal.value; point.y = circle.cy.baseVal.value; const start = point.matrixTransform(matrix); point.x = 100 + value * 20; const end = point.matrixTransform(matrix); return { start: { x: start.x, y: start.y }, end: { x: end.x, y: end.y } }; }, target);
  const cdp = await page.context().newCDPSession(page);
  try {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...points.start, id: 1 }] });
    for (let step = 1; step <= 5; step++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: points.start.x + (points.end.x - points.start.x) * step / 5, y: points.start.y, id: 1 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } finally { await cdp.detach(); }
  await expect(page.locator(current + ' [data-summary-reading="selected"]')).toHaveText(String(target));
}
async function frozenTouchGesture(page: Page, index: number, cancel: boolean) {
  const mark = page.locator('[data-summary-condition="pinned"] [data-summary-mark="' + index + '"]'); await mark.scrollIntoViewIfNeeded();
  const start = await mark.locator('[data-summary-point]').evaluate(node => { const box = node.getBoundingClientRect(); return { x: box.x + box.width / 2, y: box.y + box.height / 2 }; });
  const cdp = await page.context().newCDPSession(page);
  try {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...start, id: 1 }] });
    for (let step = 1; step <= 5; step++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: start.x + (cancel ? 2 : 20) * step / 5, y: start.y, id: 1 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: cancel ? 'touchCancel' : 'touchEnd', touchPoints: [] });
  } finally { await cdp.detach(); }
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}
async function lostCaptureHover(page: Page, index: number) {
  const before = await values(page), mark = page.locator(current + ' [data-summary-mark="' + index + '"]'); await mark.scrollIntoViewIfNeeded();
  const points = await mark.evaluate(node => {
    node.removeAttribute('data-summary-test-got'); node.removeAttribute('data-summary-test-lost');
    node.addEventListener('gotpointercapture', event => node.setAttribute('data-summary-test-got', String((event as PointerEvent).pointerId)), { once: true });
    node.addEventListener('lostpointercapture', event => node.setAttribute('data-summary-test-lost', String((event as PointerEvent).pointerId)), { once: true });
    const svg = (node as SVGGElement).ownerSVGElement!, circle = node.querySelector<SVGCircleElement>('[data-summary-point]')!, point = svg.createSVGPoint(), matrix = svg.getScreenCTM()!;
    point.x = circle.cx.baseVal.value; point.y = circle.cy.baseVal.value; const start = point.matrixTransform(matrix);
    // One unit remains inside this mark's 44-native-unit transparent hit box.
    // Move inward at the upper bound so a stale hover would visibly edit it.
    point.x += point.x >= 500 ? -20 : 20; const hover = point.matrixTransform(matrix);
    return { start: { x: start.x, y: start.y }, hover: { x: hover.x, y: hover.y } };
  });
  await page.mouse.move(points.start.x, points.start.y); await page.mouse.down(); await page.mouse.move(points.start.x + .25, points.start.y);
  await expect(mark).toHaveAttribute('data-summary-test-got', /^\d+$/); const pointer = (await mark.getAttribute('data-summary-test-got'))!;
  expect(await mark.evaluate((node, id) => (node as SVGGElement).hasPointerCapture(Number(id)), pointer)).toBe(true);
  // Native capture release generates a genuine lostpointercapture event. No
  // synthetic event invokes the app's cleanup on the test's behalf.
  await mark.evaluate((node, id) => (node as SVGGElement).releasePointerCapture(Number(id)), pointer);
  await page.mouse.move(points.start.x + .5, points.start.y); await expect(mark).toHaveAttribute('data-summary-test-lost', pointer);
  await page.mouse.move(1, 1); await page.mouse.up(); await page.mouse.move(points.hover.x, points.hover.y);
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  expect(await values(page)).toEqual(before); await expect(mark).toHaveAttribute('aria-valuenow', String(before[index]));
  expect(await mark.locator('[data-summary-point]').evaluate((node: SVGCircleElement) => node.cx.baseVal.value)).toBe(100 + before[index] * 20);
}

test('native reading rails, signed distances and ordered identities agree with histogram and pairwise-rank oracles including ties, coincidences and extremes', async ({ page }) => {
  await mount(page);
  for (const readings of [defaults, [6, 8, 9, 10, 11, 12, 20], [20, 8, 9, 10, 11, 12, 14], [0, 0, 0, 0, 0, 0, 0], [20, 20, 20, 20, 20, 20, 20],
    [10, 10, 10, 10, 10, 10, 10], [0, 0, 0, 0, 0, 0, 20], [0, 20, 20, 20, 20, 20, 20], [0, 20, 0, 20, 0, 20, 10], [9, 8, 8, 7, 6, 6, 5], [12, 1, 20, 1, 12, 1, 12]]) {
    const model = { ...initial, values: readings }; await replace(page, model); await expect(page.locator(current)).toHaveAttribute('data-summary-values', readings.join(','));
    assertNative(await drawing(page), model); assertLabels(await labels(page));
  }
  await replace(page, { ...initial, values: [6, 8, 9, 10, 11, 12, 20] }); expect((await drawing(page)).readings.median).toBe('10'); expect(Number((await drawing(page)).readings.mean)).toBeGreaterThan(10);
});

test('all seven frozen readings, exact bounded edits and shared identity survive reordered ranks, reference browsing, malformed arrays and host writes without progress awards', async ({ page }) => {
  await mount(page); const pin = page.locator('[data-summary-pin]'); await pin.click();
  await range(page, 20); assertNative(await drawing(page), { ...initial, values: [6, 8, 9, 10, 11, 12, 20] }); assertNative(await drawing(page, 'pinned'), initial);
  await select(page, 0); await range(page, 0); await page.locator('[data-summary-experiment="plus"]').click(); expect(await values(page)).toEqual([10, 8, 9, 10, 11, 12, 14]); expect(await values(page, 'pinned')).toEqual(defaults);
  assertNative(await drawing(page), { ...initial, selected: 0, values: [10, 8, 9, 10, 11, 12, 14] }); assertNative(await drawing(page, 'pinned'), { ...initial, selected: 0 });
  const stable = await drawing(page); await page.getByRole('button', { name: '📊 Visual', exact: true }).click(); await expect(page.getByText('📋 Visual Acuity Comparison', { exact: true })).toBeVisible(); expect(await drawing(page)).toEqual(stable);
  await page.evaluate(() => (window as any).__ctx.setToolData((old: any) => ({ ...old, unrelatedRound22: 'kept', raptorHunt: { ...old.raptorHunt, unrelatedRound22: 'kept' } })));
  expect(await drawing(page)).toEqual(stable); expect(await values(page, 'pinned')).toEqual(defaults);
  await page.locator('[data-summary-condition="pinned"] [data-summary-mark="6"]').click(); await expect(page.locator('[data-summary-select="6"]')).toHaveAttribute('aria-pressed', 'true'); expect(await values(page)).toEqual([10, 8, 9, 10, 11, 12, 14]);
  for (const [kind, expected] of [ ['minus', [6, 8, 9, 10, 11, 12, 10]], ['shiftPlus', [8, 10, 11, 12, 13, 14, 16]], ['shiftMinus', [4, 6, 7, 8, 9, 10, 12]], ['plus', [6, 8, 9, 10, 11, 12, 18]] ] as const) {
    await page.locator('[data-summary-experiment="' + kind + '"]').click(); expect(await values(page)).toEqual(expected); expect(await values(page, 'pinned')).toEqual(defaults); assertNative(await drawing(page), { ...initial, values: [...expected] });
  }
  await page.locator('[data-summary-answer="context"]').click(); await expect(page.locator('.rh-summary-feedback')).toContainText('Correct. Distance from other readings'); await page.locator('[data-summary-reset]').click(); await expect(page.locator('.rh-summary-feedback')).toHaveCount(0); expect(await values(page)).toEqual(defaults); expect(await values(page, 'pinned')).toEqual(defaults);
  await replace(page, { ...initial, values: [0, 20, 2, 18, 8, 12, 19], selected: 6 }); await pin.click();
  for (const kind of ['plus', 'shiftPlus', 'shiftMinus']) await expect(page.locator('[data-summary-experiment="' + kind + '"]')).toBeDisabled(); await expect(page.locator('[data-summary-experiment="minus"]')).toBeEnabled();
  await select(page, 0); await expect(page.locator('[data-summary-experiment="minus"]')).toBeDisabled(); await expect(page.locator('[data-summary-experiment="plus"]')).toBeEnabled();
  await page.locator('[data-summary-experiment="plus"]').click(); expect(await values(page)).toEqual([4, 20, 2, 18, 8, 12, 19]);
  await replace(page, { ...initial, values: [2, 2, 2, 18, 18, 18, 18] }); await pin.click(); await page.locator('[data-summary-experiment="shiftPlus"]').click(); expect(await values(page)).toEqual([4, 4, 4, 20, 20, 20, 20]); await page.locator('[data-summary-experiment="shiftMinus"]').click(); expect(await values(page)).toEqual([0, 0, 0, 16, 16, 16, 16]);
  await page.locator('[data-summary-clear]').click(); await expect(pin).toBeFocused(); await expect(page.locator('[data-summary-condition="pinned"]')).toHaveCount(0);
  await replace(page, { version: 1, values: [Infinity, '4', -100, 100, 4.49, 4.51, NaN], selected: 99 }); expect(await values(page)).toEqual([6, 8, 0, 20, 4, 5, 14]); await expect(page.locator('[data-summary-select="6"]')).toHaveAttribute('aria-pressed', 'true');
  await replace(page, { version: 1, values: [1, 2], selected: '2' }); expect(await values(page)).toEqual(defaults); await expect(page.locator('[data-summary-select="6"]')).toHaveAttribute('aria-pressed', 'true');
  await page.evaluate(() => (window as any).__ctx.setToolData((old: any) => ({ ...old, raptorHunt: { ...old.raptorHunt, summaryStudy: { version: 1, values: Array(7), selected: -1 } } })));
  await expect(page.locator(current)).toHaveAttribute('data-summary-values', defaults.join(',')); await expect(page.locator('[data-summary-select="0"]')).toHaveAttribute('aria-pressed', 'true');
  await range(page, 7); const saved = await page.evaluate(() => (window as any).__toolData.raptorHunt.summaryStudy); expect(saved).toEqual({ version: 1, values: [7, 8, 9, 10, 11, 12, 14], selected: 0 });
  const host = await page.evaluate(() => (window as any).__toolData); expect(host.raptorHunt.xp).toBe(0); expect(host.unrelatedRound22).toBe('kept'); expect(host.raptorHunt.unrelatedRound22).toBe('kept');
  await harness.destroy(page); await mount(page, saved); expect(await values(page)).toEqual(saved.values); await expect(page.locator('[data-summary-select="0"]')).toHaveAttribute('aria-pressed', 'true'); await expect(page.locator('[data-summary-condition="pinned"]')).toHaveCount(0);
  await replace(page, { version: 99, values: Array(7).fill(0), selected: 0 }); expect(await values(page)).toEqual(defaults); await expect(page.locator('[data-summary-select="6"]')).toHaveAttribute('aria-pressed', 'true');
});

test('actual touch dragging, native slider keys and frozen selection stay accessible with readable non-overlapping labels and eight axe rules at three host widths', async ({ page }) => {
  await mount(page);
  for (const layout of [{ viewport: 1280, host: 1100 }, { viewport: 390, host: 390 }, { viewport: 1280, host: 500 }]) {
    await page.setViewportSize({ width: layout.viewport, height: 1000 }); await page.locator('#wrap').evaluate((node: HTMLElement, width) => { node.style.width = width + 'px'; node.style.maxWidth = '100%'; node.setAttribute('data-stem-tool-shell', 'true'); }, layout.host);
    if (await page.locator('[data-summary-condition="pinned"]').count()) await page.locator('[data-summary-clear]').click(); await page.locator('[data-summary-reset]').click();
    const choice = page.locator('[data-summary-select="6"]'); await choice.tap(); await expect(choice).toHaveAttribute('aria-pressed', 'true'); const choiceBox = (await choice.boundingBox())!; expect(choiceBox.height).toBeGreaterThanOrEqual(44); expect(choiceBox.width).toBeGreaterThanOrEqual(44);
    await touchDrag(page, 6, 20); expect(await values(page)).toEqual([6, 8, 9, 10, 11, 12, 20]); await lostCaptureHover(page, 6);
    const mark = page.locator(current + ' [data-summary-mark="6"]'); await mark.focus(); await page.keyboard.press('Home'); await expect(mark).toHaveAttribute('aria-valuenow', '0'); await page.keyboard.press('ArrowRight'); await expect(mark).toHaveAttribute('aria-valuenow', '1'); await page.keyboard.press('PageUp'); await expect(mark).toHaveAttribute('aria-valuenow', '5'); await page.keyboard.press('End'); await expect(mark).toHaveAttribute('aria-valuenow', '20'); await expect(mark).toBeFocused();
    await page.locator('[data-summary-reset]').click(); await expect(page.locator('#rh-summary-value')).toHaveValue('14'); const value = page.locator('#rh-summary-value'); await value.focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight'); await expect(value).toHaveValue('1'); await expect(value).toBeFocused(); await page.locator('[data-summary-reset]').click();
    const pin = page.locator('[data-summary-pin]'); await pin.focus(); await page.keyboard.press('Enter'); await expect(pin).toBeFocused(); await touchDrag(page, 6, 20);
    await page.evaluate(() => {
      const eventTypes = ['pointerdown', 'pointerup', 'pointercancel', 'gotpointercapture', 'lostpointercapture', 'touchstart', 'touchend', 'click', 'focusin'], events: unknown[] = [];
      const listener = (event: Event) => { const target = event.target as Element, mark = target.closest?.('[data-summary-mark]'); events.push({ type: event.type, target: target.tagName, mark: mark?.getAttribute('data-summary-mark'), condition: mark?.closest('[data-summary-condition]')?.getAttribute('data-summary-condition'), prevented: event.defaultPrevented, pointer: (event as PointerEvent).pointerId, pointerType: (event as PointerEvent).pointerType, active: document.activeElement?.getAttribute('data-summary-mark') }); };
      eventTypes.forEach(type => document.addEventListener(type, listener, true));
      (window as any).__round22FrozenTapTrace = { events, stop: () => eventTypes.forEach(type => document.removeEventListener(type, listener, true)) };
    });
    try {
      await page.locator('[data-summary-condition="pinned"] [data-summary-mark="0"]').tap(); await expect(page.locator('[data-summary-select="0"]')).toHaveAttribute('aria-pressed', 'true');
    } finally {
      const events = await page.evaluate(() => { const trace = (window as any).__round22FrozenTapTrace; trace.stop(); delete (window as any).__round22FrozenTapTrace; return trace.events; });
      await test.info().attach('frozen-tap-events-' + layout.host, { body: JSON.stringify(events, null, 2), contentType: 'application/json' });
    }
    expect(await values(page, 'pinned')).toEqual(defaults); expect(await values(page)).toEqual([6, 8, 9, 10, 11, 12, 20]);
    await frozenTouchGesture(page, 1, false); await expect(page.locator('[data-summary-select="0"]')).toHaveAttribute('aria-pressed', 'true');
    await frozenTouchGesture(page, 2, true); await expect(page.locator('[data-summary-select="0"]')).toHaveAttribute('aria-pressed', 'true'); expect(await values(page, 'pinned')).toEqual(defaults); expect(await values(page)).toEqual([6, 8, 9, 10, 11, 12, 20]);
    const plus = page.locator('[data-summary-experiment="plus"]'); await plus.focus(); await page.keyboard.press('Enter'); await expect(plus).toBeFocused(); expect(await values(page)).toEqual([10, 8, 9, 10, 11, 12, 14]);
    const answer = page.locator('[data-summary-answer="context"]'); await answer.focus(); await page.keyboard.press('Enter'); await expect(answer).toBeFocused(); await expect(page.locator('.rh-summary-feedback')).toContainText('Correct.');
    const host = (await page.locator('#wrap').boundingBox())!;
    for (const selector of [root, '.rh-summary-identities', '.rh-summary-comparison', '.rh-summary-evidence', '.rh-summary-model', current, '[data-summary-condition="pinned"]']) { const node = page.locator(selector), box = (await node.boundingBox())!; expect(box.x).toBeGreaterThanOrEqual(host.x - 1); expect(box.x + box.width).toBeLessThanOrEqual(host.x + host.width + 1); expect(await node.evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1); }
    for (const readings of [defaults, Array(7).fill(0), Array(7).fill(20), Array(7).fill(10), [0, 20, 20, 20, 20, 20, 20], [0, 0, 0, 0, 0, 0, 20]]) { await replace(page, { ...initial, values: readings }); await expect(page.locator(current)).toHaveAttribute('data-summary-values', readings.join(',')); assertNative(await drawing(page), { ...initial, values: readings }); assertLabels(await labels(page), 11); }
    const violations = await page.evaluate(async () => (await (window as any).axe.run(document.querySelector('[data-raptor-summary-study]'), { runOnly: { type: 'rule', values: ['color-contrast', 'button-name', 'select-name', 'label', 'aria-valid-attr-value', 'aria-required-children', 'aria-required-parent', 'nested-interactive'] } })).violations.map((item: any) => ({ id: item.id, nodes: item.nodes.map((node: any) => node.target) })));
    expect(violations).toEqual([]); expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  }
});
