import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off' });
test.describe.configure({ mode: 'default', retries: 0, timeout: 180_000 });
const harness = new GlHarness({ toolId: 'birdLab', toolFile: 'stem_lab/stem_tool_birdlab.js', preScripts: ['stem_lab/stem_lab_module.js'],
  extraScripts: ['node_modules/axe-core/axe.min.js'], width: 1100, height: 960, appStyles: true, layout: 'document' });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => { await harness.destroy(page); });

type Model = { gap: number; growth: number };
const defaults: Model = { gap: 4, growth: 8 };
const root = '[data-birdlab-molt-study]', condition = (key = 'current') => '[data-molt-condition="' + key + '"]';
const x = (day: number) => 100 + 10 * day, y = (sum: number) => 260 - 200 * sum / 6;
function near(actual: number, expected: number, tolerance = 1e-4) { expect(Math.abs(actual - expected)).toBeLessThan(tolerance); }
async function sizing(page: Page, viewport: number, host: number) {
  await page.setViewportSize({ width: viewport, height: 1000 });
  await page.locator('#wrap').evaluate((element: HTMLElement, width) => { element.style.width = width + 'px'; element.style.maxWidth = '100%'; element.setAttribute('data-stem-tool-shell', 'true'); }, host);
}
async function mount(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { birdLab: { view: 'plumage', blXp: 0, blLifeList: {}, blBadges: {} } }, undefined, { expectCanvas: false });
  await sizing(page, 1280, 1100); await expect(page.locator(root)).toBeVisible();
}
async function settings(page: Page, model: Model) { await page.locator('#birdlab-molt-gap').fill(String(model.gap)); await page.locator('#birdlab-molt-growth').fill(String(model.growth)); }
// Keep integer numerators while integrating the number of active regrowth
// intervals. Drops remove one whole numerator; completions stop its slope.
// This reconstructs the plotted series independently of runtime fraction sums.
function oracle(model: Model, day: number) {
  const starts = Array.from({ length: 6 }, (_, i) => 4 + i * model.gap), ends = starts.map(start => start + model.growth);
  const times = [...new Set([0, 60, ...starts, ...ends])].sort((a, b) => a - b);
  let numerator = 6 * model.growth, active = 0, previous = 0, gained = 0, removed = 0, peak = 0, minimumNumerator = numerator, minimumDay = 0;
  const vertices: number[][] = [[0, 6]], jumps: { day: number; before: number; after: number }[] = [];
  for (const time of times.slice(1)) {
    const increase = (time - previous) * active; numerator += increase; gained += increase;
    const before = numerator / model.growth, drops = starts.filter(start => start === time).length, completions = ends.filter(end => end === time).length;
    vertices.push([time, before]); numerator -= drops * model.growth; removed += drops * model.growth;
    if (drops) { vertices.push([time, numerator / model.growth]); jumps.push({ day: time, before, after: numerator / model.growth }); }
    active += drops - completions; peak = Math.max(peak, active);
    if (numerator < minimumNumerator) { minimumNumerator = numerator; minimumDay = time; }
    previous = time;
  }
  const rows = starts.map((start, index) => {
    const end = ends[index], stage = day < start ? 'old' : day >= end ? 'new' : 'growing';
    const fraction = stage === 'old' || stage === 'new' ? 1 : 1 - (end - day) / model.growth;
    return { start, end, stage, fraction };
  });
  return { rows, vertices, jumps, peak, completion: Math.max(...ends), minimum: minimumNumerator / model.growth, minimumDay,
    total: rows.reduce((sum, row) => sum + row.fraction, 0), counts: Object.fromEntries(['old', 'growing', 'new'].map(stage => [stage, rows.filter(row => row.stage === stage).length])),
    gained: gained / model.growth, removed: removed / model.growth, finalTotal: numerator / model.growth };
}
async function physical(page: Page, key = 'current') {
  return page.locator(condition(key)).evaluate(element => ({ settings: ['gap', 'growth'].map(name => element.getAttribute('data-molt-' + name)),
    summary: ['completion', 'minimum', 'minimum-day', 'peak'].map(name => element.getAttribute('data-molt-' + name)),
    path: element.querySelector('[data-molt-series]')!.getAttribute('d'),
    intervals: [...element.querySelectorAll('[data-molt-interval]')].map(rect => ['data-molt-interval', 'x', 'y', 'width', 'height'].map(name => rect.getAttribute(name))) }));
}
async function checkNative(page: Page, model: Model, day: number, key = 'current', slot = 2) {
  const expected = oracle(model, day), target = page.locator(condition(key));
  const native = await target.evaluate(element => {
    function line(node: Element) { const value = node as SVGLineElement; return [value.x1.baseVal.value, value.y1.baseVal.value, value.x2.baseVal.value, value.y2.baseVal.value]; }
    const path = element.querySelector('[data-molt-series]') as SVGPathElement, values = path.getAttribute('d')!.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
    const point = element.querySelector('[data-molt-index-point]') as SVGCircleElement;
    return { settings: Object.fromEntries(['gap', 'growth'].map(name => [name, Number(element.getAttribute('data-molt-' + name))])),
      summary: Object.fromEntries(['completion', 'minimum', 'minimum-day', 'peak', 'total'].map(name => [name, Number(element.getAttribute('data-molt-' + name))])),
      views: [...element.querySelectorAll('svg')].map(svg => svg.getAttribute('viewBox')),
      slots: [...element.querySelectorAll('[data-molt-slot]')].map(node => ({ stage: node.getAttribute('data-molt-stage'), fraction: Number(node.getAttribute('data-molt-length')), shaft: line(node.querySelector('[data-molt-shaft]')!) })),
      intervals: [...element.querySelectorAll('[data-molt-interval]')].map(node => { const rect = node as SVGRectElement; return { name: rect.getAttribute('data-molt-interval'), rect: [rect.x.baseVal.value, rect.y.baseVal.value, rect.width.baseVal.value, rect.height.baseVal.value] }; }),
      vertices: Array.from({ length: values.length / 2 }, (_, i) => [values[2 * i], values[2 * i + 1]]),
      jumps: [...element.querySelectorAll('[data-molt-jump]')].map(node => { const circle = node as SVGCircleElement; return { kind: circle.getAttribute('data-molt-jump'), day: Number(circle.getAttribute('data-molt-jump-day')), point: [circle.cx.baseVal.value, circle.cy.baseVal.value] }; }),
      cursors: [...element.querySelectorAll('[data-molt-cursor]')].map(node => ({ name: node.getAttribute('data-molt-cursor'), line: line(node) })),
      point: [point.cx.baseVal.value, point.cy.baseVal.value] };
  });
  expect(native.settings).toEqual(model); expect(native.views).toEqual(['0 0 760 420', '0 0 760 440', '0 0 760 350']);
  near(native.summary.total, expected.total, 1e-9); near(native.summary.minimum, expected.minimum, 1e-9);
  expect(native.summary['minimum-day']).toBe(expected.minimumDay); expect(native.summary.peak).toBe(expected.peak); expect(native.summary.completion).toBe(expected.completion);
  expect(expected.gained).toBe(6); expect(expected.removed).toBe(6); expect(expected.finalTotal).toBe(6);
  expect(native.slots).toHaveLength(6); expect(native.intervals).toHaveLength(18);
  for (let i = 0; i < 6; i++) {
    expect(native.slots[i].stage).toBe(expected.rows[i].stage); near(native.slots[i].fraction, expected.rows[i].fraction, 1e-9);
    [100 + 105 * i, 310, 100 + 105 * i, 310 - 200 * expected.rows[i].fraction].forEach((value, j) => near(native.slots[i].shaft[j], value));
    const row = 70 + 48 * i, start = expected.rows[i].start, end = expected.rows[i].end;
    const rectangles = [[100, row, 10 * start, 16], [x(start), row, 10 * model.growth, 16], [x(end), row, 10 * (60 - end), 16]];
    for (let j = 0; j < 3; j++) { expect(native.intervals[3 * i + j].name).toBe(i + ':' + ['old', 'growing', 'new'][j]); rectangles[j].forEach((value, coordinate) => near(native.intervals[3 * i + j].rect[coordinate], value)); }
    near(rectangles.reduce((sum, rect) => sum + rect[2], 0), 600);
  }
  expect(native.vertices).toHaveLength(expected.vertices.length);
  const paintedVertices = expected.vertices.map(vertex => [Number(x(vertex[0]).toFixed(3)), Number(y(vertex[1]).toFixed(3))]);
  expected.vertices.forEach((vertex, i) => { expect(Math.abs(native.vertices[i][0] - x(vertex[0]))).toBeLessThan(.00051); expect(Math.abs(native.vertices[i][1] - y(vertex[1]))).toBeLessThan(.00051); });
  expect(native.jumps).toHaveLength(expected.jumps.length * 2);
  for (let i = 0; i < expected.jumps.length; i++) for (let j = 0; j < 2; j++) {
    const jump = expected.jumps[i], actual = native.jumps[2 * i + j]; expect(actual.kind).toBe(j ? 'after' : 'before'); expect(actual.day).toBe(jump.day);
    near(actual.point[0], x(jump.day)); near(actual.point[1], y(j ? jump.after : jump.before));
  }
  [x(day), y(expected.total)].forEach((value, coordinate) => near(native.point[coordinate], value));
  for (const cursor of native.cursors) [x(day), cursor.name === 'timeline' ? 52 : 60, x(day), cursor.name === 'timeline' ? 350 : 260].forEach((value, i) => near(cursor.line[i], value));
  for (const stage of ['old', 'growing', 'new']) await expect(target.locator('[data-molt-reading="' + stage + '"]')).toHaveText(String(expected.counts[stage]));
  expect(Object.values(expected.counts).reduce((sum, value) => sum + value, 0)).toBe(6);
  await expect(target.locator('[data-molt-reading="total"]')).toHaveText(expected.total.toFixed(2) + ' / 6');
  await expect(target.locator('[data-molt-inspector]')).toContainText('Slot ' + (slot + 1) + ' · ' + expected.rows[slot].stage);
  // Sample the browser's actual polyline at independent segment midpoints,
  // including vertical jump segments; attributes alone do not prove paint.
  let length = 0; const probes: { at: number; x: number; y: number }[] = [];
  for (let i = 1; i < paintedVertices.length; i++) { const a = paintedVertices[i - 1], b = paintedVertices[i], segment = Math.hypot(b[0] - a[0], b[1] - a[1]); if (segment > 0) probes.push({ at: length + segment / 2, x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2 }); length += segment; }
  await expect.poll(async () => target.evaluate((element, input) => {
    const failures: string[] = [], path = element.querySelector('[data-molt-series]') as SVGPathElement;
    if (Math.abs(path.getTotalLength() - input.length) > .01 || getComputedStyle(path).stroke === 'none') failures.push('native series length/stroke');
    input.probes.forEach((probe, i) => { const point = path.getPointAtLength(probe.at); if (Math.abs(point.x - probe.x) > .01 || Math.abs(point.y - probe.y) > .01 || !path.isPointInStroke(new DOMPoint(probe.x, probe.y))) failures.push('native series segment ' + i); });
    const svg = element.querySelector('[data-molt-feathers]') as SVGSVGElement, inverse = svg.getCTM()!.inverse();
    [...element.querySelectorAll('[data-molt-slot]')].forEach((node, i) => {
      const shaft = node.querySelector('[data-molt-shaft]') as SVGLineElement, symbol = node.querySelector('[data-molt-symbol]') as SVGGElement, matrix = inverse.multiply(symbol.getCTM()!);
      if (Math.abs(shaft.getTotalLength() - input.fractions[i] * 200) > .001 || Math.abs(matrix.a - input.fractions[i]) > .001 || Math.abs(matrix.d - input.fractions[i]) > .001) failures.push('native slot ' + i);
    }); return failures;
  }, { probes, length, fractions: expected.rows.map(row => row.fraction) }), { timeout: 2000, intervals: [16, 32, 64, 128] }).toEqual([]);
  return expected;
}

test('exact drop jumps, native feather lengths and schedule intervals agree with independent event integration at all stage boundaries', async ({ page }) => {
  await mount(page); const progress = await page.evaluate(() => JSON.stringify((window as any).__toolData.birdLab));
  const cases = [
    { model: defaults, days: [3.5, 4, 4.5, 8, 12, 14, 60] }, { model: { gap: 0, growth: 8 }, days: [3.5, 4, 4.5, 12] },
    { model: { gap: 8, growth: 12 }, days: [14, 44, 56] }, { model: { gap: 8, growth: 1 }, days: [4.5, 45] },
    { model: { gap: 1, growth: 12 }, days: [9, 21] }, { model: { gap: 4, growth: 4 }, days: [8, 14] }
  ];
  for (const item of cases) { await settings(page, item.model); for (const day of item.days) { await page.locator('#birdlab-molt-day').fill(String(day)); await checkNative(page, item.model, day); } }
  await settings(page, { gap: 0, growth: 8 }); await page.locator('#birdlab-molt-day').fill('4');
  const together = await checkNative(page, { gap: 0, growth: 8 }, 4); expect(together.total).toBe(0); expect(together.peak).toBe(6); expect(together.jumps).toHaveLength(1);
  await expect(page.locator('.birdlab-molt-model')).toContainText('not measured molt'); await expect(page.locator(root)).toContainText('not intermediate states');
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.birdLab))).toBe(progress);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('complete physical pins, bounded single-factor changes and shared inspectors persist through species browsing and unrelated host writes', async ({ page }) => {
  await mount(page); const progress = await page.evaluate(() => JSON.stringify((window as any).__toolData.birdLab));
  const speciesButtons = page.locator(root + ' + div button'), speciesCount = await speciesButtons.count(); expect(speciesCount).toBeGreaterThan(1);
  await page.locator('[data-molt-pin]').click(); const frozen = await physical(page, 'pinned');
  const changes: [string, Model][] = [['closer', { gap: 2, growth: 8 }], ['wider', { gap: 6, growth: 8 }], ['faster', { gap: 4, growth: 6 }], ['slower', { gap: 4, growth: 10 }], ['together', { gap: 0, growth: 8 }]];
  for (const [kind, changed] of changes) {
    await page.locator('[data-molt-experiment="' + kind + '"]').click(); await checkNative(page, changed, 14); await checkNative(page, defaults, 14, 'pinned');
    expect(Object.keys(defaults).filter(key => defaults[key as keyof Model] !== changed[key as keyof Model])).toHaveLength(1); expect(await physical(page, 'pinned')).toEqual(frozen);
  }
  await page.locator('[data-molt-experiment="closer"]').click(); await page.locator('#birdlab-molt-slot').selectOption('5');
  await page.locator('[data-molt-inspect="minimum"]').click(); await expect(page.locator('#birdlab-molt-day')).toHaveValue('10'); await checkNative(page, { gap: 2, growth: 8 }, 10, 'current', 5);
  await page.locator('[data-molt-inspect="completion"]').click(); await expect(page.locator('#birdlab-molt-day')).toHaveValue('22'); await checkNative(page, { gap: 2, growth: 8 }, 22, 'current', 5);
  expect(await physical(page, 'pinned')).toEqual(frozen); await page.locator('[data-molt-answer="limits"]').click(); await expect(page.locator('.birdlab-molt-feedback')).toContainText('Correct. This bookkeeping model tracks six relative lengths and their timing.');
  await page.locator('[data-molt-reset]').click(); await expect(page.locator('.birdlab-molt-feedback')).toHaveCount(0); await expect(page.locator('#birdlab-molt-day')).toHaveValue('22'); await expect(page.locator('#birdlab-molt-slot')).toHaveValue('5');
  await checkNative(page, defaults, 22, 'current', 5); expect(await physical(page, 'pinned')).toEqual(frozen);
  const speciesName = await speciesButtons.nth(1).textContent(); await speciesButtons.nth(1).click(); await expect(page.getByRole('heading', { level: 2, name: speciesName!, exact: true })).toBeVisible();
  const current = await physical(page); expect(await physical(page, 'pinned')).toEqual(frozen); expect(await speciesButtons.count()).toBe(speciesCount);
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.birdLab))).toBe(progress);
  await page.evaluate(() => (window as any).__ctx.update('birdLab', 'blXp', 17)); await expect.poll(() => page.evaluate(() => (window as any).__toolData.birdLab.blXp)).toBe(17);
  expect(await physical(page)).toEqual(current); expect(await physical(page, 'pinned')).toEqual(frozen); await expect(page.locator('#birdlab-molt-day')).toHaveValue('22'); await expect(page.locator('#birdlab-molt-slot')).toHaveValue('5');
  await settings(page, { gap: 0, growth: 1 }); await page.locator('[data-molt-pin]').click(); for (const kind of ['closer', 'faster', 'together']) await expect(page.locator('[data-molt-experiment="' + kind + '"]')).toBeDisabled();
  await settings(page, { gap: 8, growth: 12 }); await page.locator('[data-molt-pin]').click(); for (const kind of ['wider', 'slower']) await expect(page.locator('[data-molt-experiment="' + kind + '"]')).toBeDisabled();
  await page.locator('[data-molt-clear]').click(); await expect(page.locator(condition('pinned'))).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).__toolData.birdLab.blXp)).toBe(17); expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('manual schedule controls, discontinuity plots and frozen comparisons remain keyboard readable at desktop, phone and embedded widths', async ({ page }) => {
  await mount(page);
  for (const layout of [{ viewport: 1280, host: 1100 }, { viewport: 390, host: 390 }, { viewport: 1280, host: 500 }]) {
    await sizing(page, layout.viewport, layout.host); await page.locator('[data-molt-reset]').click();
    for (const [key, min, step, max] of [['gap', 0, 1, 8], ['growth', 1, 1, 12], ['day', 0, .5, 60]] as [string, number, number, number][]) {
      const input = page.locator('#birdlab-molt-' + key); await input.focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowLeft'); await expect(input).toHaveValue(String(min));
      await page.keyboard.press('ArrowRight'); await expect(input).toHaveValue(String(min + step)); await expect(input).toBeFocused(); await page.keyboard.press('End'); await page.keyboard.press('ArrowRight'); await expect(input).toHaveValue(String(max));
    }
    await page.locator('[data-molt-reset]').click(); await page.locator('#birdlab-molt-day').fill('14');
    const select = page.locator('#birdlab-molt-slot'); await select.focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowDown'); await expect(select).toHaveValue('1'); await expect(select).toBeFocused();
    const pin = page.locator('[data-molt-pin]'); await pin.focus(); await page.keyboard.press('Enter'); await expect(pin).toBeFocused();
    const closer = page.locator('[data-molt-experiment="closer"]'); await closer.focus(); await page.keyboard.press('Enter'); await expect(closer).toBeFocused();
    await checkNative(page, { gap: 2, growth: 8 }, 14, 'current', 1); await checkNative(page, defaults, 14, 'pinned', 1);
    const answer = page.locator('[data-molt-answer="limits"]'); await answer.focus(); await page.keyboard.press('Enter'); await expect(answer).toBeFocused(); await expect(page.locator('.birdlab-molt-feedback')).toContainText('Correct. This bookkeeping model tracks six relative lengths and their timing.');
    const host = (await page.locator('#wrap').boundingBox())!;
    for (const selector of [root, condition(), condition('pinned'), '.birdlab-molt-controls', '.birdlab-molt-day', '.birdlab-molt-comparison', '.birdlab-molt-evidence', '.birdlab-molt-model']) {
      const node = page.locator(selector), box = (await node.boundingBox())!; expect(box.x, selector).toBeGreaterThanOrEqual(host.x - 1); expect(box.x + box.width, selector).toBeLessThanOrEqual(host.x + host.width + 1); expect(await node.evaluate(element => element.scrollWidth - element.clientWidth), selector).toBeLessThanOrEqual(1);
    }
    for (const key of ['current', 'pinned']) for (const kind of ['feathers', 'timeline', 'index']) expect((await page.locator('[data-molt-' + kind + '="' + key + '"]').boundingBox())!.width).toBeGreaterThan(280);
    const columns = await page.locator('.birdlab-molt-conditions').evaluate(element => [...element.children].map(node => ({ top: node.getBoundingClientRect().top, left: node.getBoundingClientRect().left })));
    if (layout.host <= 500) { expect(columns[1].top).toBeGreaterThan(columns[0].top); expect(columns[1].left).toBeCloseTo(columns[0].left, 1); } else expect(columns[1].top).toBeCloseTo(columns[0].top, 1);
    const bounds = await page.locator(root).evaluate(element => [...element.querySelectorAll('svg text')].map(node => {
      const text = node as SVGTextElement, box = text.getBBox(), svg = text.ownerSVGElement!; return { text: text.textContent, x: box.x, right: box.x + box.width, top: box.y, bottom: box.y + box.height, width: svg.viewBox.baseVal.width, height: svg.viewBox.baseVal.height, size: parseFloat(getComputedStyle(text).fontSize) * svg.getBoundingClientRect().width / svg.viewBox.baseVal.width };
    }));
    for (const text of bounds) { expect(text.x, text.text || '').toBeGreaterThanOrEqual(0); expect(text.right, text.text || '').toBeLessThanOrEqual(text.width); expect(text.top, text.text || '').toBeGreaterThanOrEqual(0); expect(text.bottom, text.text || '').toBeLessThanOrEqual(text.height); expect(text.size, text.text || '').toBeGreaterThanOrEqual(11); }
    const violations = await page.evaluate(async () => {
      const result = await (window as any).axe.run(document.querySelector('[data-birdlab-molt-study]'), { runOnly: { type: 'rule', values: ['color-contrast', 'button-name', 'select-name', 'label', 'aria-valid-attr-value', 'aria-required-children', 'aria-required-parent', 'nested-interactive'] } });
      return result.violations.map((item: any) => ({ id: item.id, nodes: item.nodes.map((node: any) => node.target) }));
    }); expect(violations).toEqual([]); expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  }
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
