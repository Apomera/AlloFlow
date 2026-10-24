import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off' });
test.describe.configure({ timeout: 180_000, retries: 0 });
const harness = new GlHarness({ toolId: 'raptorHunt', toolFile: 'stem_lab/stem_tool_raptorhunt.js', width: 1100, height: 1000,
  layout: 'document', appStyles: true, extraScripts: ['node_modules/axe-core/axe.min.js'] });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

type Model = { version: number; pool: number; first: number; second: number; overlap: number };
const initial: Model = { version: 1, pool: 24, first: 8, second: 8, overlap: 3 };
const root = '[data-raptor-overlap-study]';
async function mount(page: Page, overlapStudy?: any) {
  await page.setViewportSize({ width: 1280, height: 1000 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { raptorHunt: { activeSection: 'fieldnat', overlapStudy, xp: 0 } }, undefined, { expectCanvas: false });
  await expect(page.locator(root)).toBeVisible();
}
async function replace(page: Page, model: any) {
  await page.evaluate(value => (window as any).__ctx.setToolData((old: any) => ({ ...old, raptorHunt: { ...old.raptorHunt, overlapStudy: value } })), model);
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}
async function range(page: Page, key: string, value: number) {
  await page.locator('#rh-overlap-' + key).evaluate((element: HTMLInputElement, next) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(element, String(next));
    element.dispatchEvent(new Event('input', { bubbles: true })); element.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
  await expect(page.locator('#rh-overlap-' + key)).toHaveValue(String(value));
}
async function physical(page: Page, key = 'current') {
  return page.locator('[data-overlap-condition="' + key + '"]').evaluate(element => ({
    pool: Number(element.getAttribute('data-overlap-pool')), first: Number(element.getAttribute('data-overlap-first')), second: Number(element.getAttribute('data-overlap-second')),
  }));
}
async function drawing(page: Page, key = 'current'): Promise<any> {
  return page.locator('[data-overlap-condition="' + key + '"]').evaluate(condition => {
    const plate = condition.querySelector('[data-overlap-plate]')!, plot = condition.querySelector('[data-overlap-distribution]')!;
    const rect = (node: SVGRectElement) => [node.x.baseVal.value, node.y.baseVal.value, node.width.baseVal.value, node.height.baseVal.value];
    const line = (node: SVGLineElement) => [node.x1.baseVal.value, node.y1.baseVal.value, node.x2.baseVal.value, node.y2.baseVal.value];
    const point = plot.querySelector<SVGCircleElement>('[data-overlap-point]')!;
    return {
      possible: condition.getAttribute('data-overlap-feasible'),
      bars: [...plot.querySelectorAll<SVGRectElement>('[data-overlap-bar]')].map(node => ({ k: Number(node.getAttribute('data-overlap-bar')), rect: rect(node), fill: getComputedStyle(node).fill, stroke: getComputedStyle(node).stroke, width: parseFloat(getComputedStyle(node).strokeWidth) })),
      mean: line(plot.querySelector<SVGLineElement>('[data-overlap-mean-line]')!), inspector: line(plot.querySelector<SVGLineElement>('[data-overlap-inspector-line]')!),
      point: [point.cx.baseVal.value, point.cy.baseVal.value],
      tokens: [...plate.querySelectorAll<SVGGElement>('[data-overlap-token]')].map(node => {
        const circle = node.querySelector<SVGCircleElement>('circle')!, square = node.querySelector<SVGRectElement>('[data-overlap-second-shape]');
        return { id: Number(node.getAttribute('data-overlap-token')), label: node.querySelector('text')!.textContent,
          center: [circle.cx.baseVal.value, circle.cy.baseVal.value], radius: circle.r.baseVal.value, fill: getComputedStyle(circle).fill,
          square: square ? rect(square) : null, squareStroke: square ? getComputedStyle(square).stroke : null,
          first: node.getAttribute('data-overlap-first'), second: node.getAttribute('data-overlap-second'), category: node.getAttribute('data-overlap-category') };
      }),
      bins: Object.fromEntries([...condition.querySelectorAll('[data-overlap-bin]')].map(node => [node.getAttribute('data-overlap-bin'), node.querySelector('strong')!.textContent])),
      readings: Object.fromEntries(['probability', 'mean', 'support', 'mass'].map(name => [name, condition.querySelector('[data-overlap-' + name + ']')!.textContent])),
      plateText: plate.textContent,
    };
  });
}

// Independent oracle: evolve the count distribution after each second-sample
// draw using the remaining marked and unmarked inventory. No combinations,
// factorials, closed-form PMF or production helper are evaluated here.
function drawInventory(model: Model) {
  let mass = Array(13).fill(0); mass[0] = 1;
  for (let drawn = 0; drawn < model.second; drawn++) {
    const next = Array(13).fill(0);
    for (let shared = 0; shared <= 12; shared++) {
      if (!mass[shared]) continue;
      const marked = model.first - shared, plain = model.pool - model.first - (drawn - shared), remaining = model.pool - drawn;
      if (marked > 0) next[shared + 1] += mass[shared] * marked / remaining;
      if (plain > 0) next[shared] += mass[shared] * plain / remaining;
    }
    mass = next;
  }
  return mass;
}
// A second oracle exhausts every second-sample subset for the smallest pool.
// Each subset is an equally likely outcome; first-sample identities are fixed.
function enumerateSubsets(model: Model) {
  expect(model.pool).toBe(12); const counts = Array(13).fill(0); let outcomes = 0;
  for (let mask = 0; mask < 2 ** model.pool; mask++) {
    let selected = 0, shared = 0;
    for (let id = 0; id < model.pool; id++) if (mask & (1 << id)) { selected++; if (id < model.first) shared++; }
    if (selected === model.second) { counts[shared]++; outcomes++; }
  }
  return counts.map(count => count / outcomes);
}
function assertNative(actual: any, model: Model) {
  const oracle = drawInventory(model), possible = oracle[model.overlap] > 0, support = oracle.map((p, k) => p > 0 ? k : -1).filter(k => k >= 0);
  const expectedMean = oracle.reduce((sum, p, k) => sum + p * k, 0);
  if (model.pool === 12) { const exhaustive = enumerateSubsets(model); oracle.forEach((p, k) => expect(p).toBeCloseTo(exhaustive[k], 13)); }
  expect(oracle.reduce((sum, p) => sum + p, 0)).toBeCloseTo(1, 13);
  expect(actual.possible).toBe(String(possible)); expect(actual.bars).toHaveLength(13);
  let nativeMass = 0, nativeMean = 0;
  for (const bar of actual.bars) {
    expect(bar.rect[0]).toBe(80 + bar.k * 40 - 13); expect(bar.rect[2]).toBe(26);
    const nativeProbability = bar.rect[3] / 188;
    expect(nativeProbability).toBeCloseTo(oracle[bar.k], 6); expect((280 - bar.rect[1]) / 188).toBeCloseTo(oracle[bar.k], 6);
    expect(bar.rect[1] + bar.rect[3]).toBeCloseTo(280, 4); expect(nativeProbability).toBeGreaterThanOrEqual(0); expect(nativeProbability).toBeLessThanOrEqual(1);
    expect(bar.fill).toBe('rgb(129, 220, 223)'); expect(bar.width).toBe(bar.k === model.overlap ? 3 : 1);
    if (bar.k === model.overlap) expect(bar.stroke).toBe('rgb(255, 226, 171)');
    nativeMass += nativeProbability; nativeMean += nativeProbability * bar.k;
  }
  expect(nativeMass).toBeCloseTo(1, 6); expect(nativeMean).toBeCloseTo(expectedMean, 5);
  expect((actual.mean[0] - 80) / 40).toBeCloseTo(expectedMean, 5); expect(actual.mean[0]).toBe(actual.mean[2]); expect(actual.mean[1]).toBe(82); expect(actual.mean[3]).toBe(280);
  expect(actual.inspector).toEqual([80 + model.overlap * 40, 82, 80 + model.overlap * 40, 280]);
  expect(actual.point[0]).toBe(80 + model.overlap * 40); expect((280 - actual.point[1]) / 188).toBeCloseTo(oracle[model.overlap], 6);
  expect(parseFloat(actual.readings.probability)).toBeCloseTo(oracle[model.overlap], 5); expect(parseFloat(actual.readings.mean)).toBeCloseTo(expectedMean, 2);
  expect(actual.readings.support).toBe(support[0] + '–' + support.at(-1)); expect(actual.readings.mass).toBe('1.000000');
  expect(actual.tokens).toHaveLength(model.pool); expect(new Set(actual.tokens.map((token: any) => token.id)).size).toBe(model.pool);
  const membership = { both: 0, first: 0, second: 0, neither: 0 }; let firstCount = 0, secondCount = 0;
  for (const token of actual.tokens) {
    expect(token.label).toBe(String(token.id)); expect(token.center).toEqual([83 + (token.id - 1) % 6 * 94, 120 + Math.floor((token.id - 1) / 6) * 57]); expect(token.radius).toBe(21);
    // Infer actual membership from native filled circle and outlined square,
    // then check the DOM metadata agrees. Dataset text is not the oracle.
    const first = token.fill === 'rgb(244, 211, 146)', second = token.square !== null;
    if (!first) expect(token.fill).toBe('rgb(23, 62, 73)');
    if (second) { expect(token.square).toEqual([token.center[0] - 25, token.center[1] - 25, 50, 50]); expect(token.squareStroke).toBe('rgb(129, 220, 223)'); }
    expect(token.first).toBe(String(first)); expect(token.second).toBe(String(second));
    const category = first ? second ? 'both' : 'first' : second ? 'second' : 'neither'; expect(token.category).toBe(category); membership[category]++;
    firstCount += Number(first); secondCount += Number(second);
  }
  if (possible) {
    expect(firstCount).toBe(model.first); expect(secondCount).toBe(model.second); expect(membership.both).toBe(model.overlap);
    expect(Object.values(membership).reduce((a, b) => a + b, 0)).toBe(model.pool);
    for (const [category, count] of Object.entries(membership)) expect(actual.bins[category]).toBe(String(count));
    expect(actual.plateText).not.toContain('No compatible arrangement');
  } else {
    expect(firstCount).toBe(0); expect(secondCount).toBe(0); expect(membership.neither).toBe(model.pool);
    expect(Object.values(actual.bins)).toEqual(['—', '—', '—', '—']); expect(actual.plateText).toContain('No compatible arrangement'); expect(actual.plateText).toContain('Probability is zero here');
  }
}

test('native token memberships and full overlap bars agree with independent inventory draws and exhaustive subsets through impossible, empty and certain limits', async ({ page }) => {
  await mount(page);
  for (const patch of [
    {}, { pool: 12, overlap: 4 }, { pool: 12, overlap: 3 }, { pool: 12, first: 6, second: 6, overlap: 0 },
    { pool: 12, first: 12, second: 12, overlap: 12 }, { pool: 12, first: 0, second: 12, overlap: 0 },
    { first: 0, second: 0, overlap: 12 }, { pool: 36, first: 12, second: 12, overlap: 4 },
    { pool: 13, first: 11, second: 12, overlap: 10 }, { pool: 36, first: 1, second: 12, overlap: 1 },
    { pool: 12, first: 12, second: 5, overlap: 5 }, { second: 0, overlap: 0 }, { first: 1, second: 1, overlap: 2 },
  ]) {
    const model = { ...initial, ...patch }; await replace(page, model);
    await expect(page.locator('#rh-overlap-pool')).toHaveValue(String(model.pool)); await expect.poll(async () => (await physical(page)).second).toBe(model.second);
    assertNative(await drawing(page), model);
    if (!model.first || !model.second) await expect(page.locator('[data-overlap-condition="current"]')).toContainText('An empty sample forces overlap zero');
  }
});

test('complete sampling pins and exact bounded one-factor comparisons preserve a shared potentially impossible inspector, reference tabs, persisted counts and progress', async ({ page }) => {
  await mount(page); const pin = page.locator('[data-overlap-pin]'); await pin.click(); const frozen = await physical(page, 'pinned');
  await range(page, 'pool', 36); await range(page, 'first', 2); await range(page, 'second', 12);
  await page.locator('[data-overlap-experiment="poolHalf"]').click(); expect(await physical(page)).toEqual({ pool: 12, first: 8, second: 8 }); expect(await physical(page, 'pinned')).toEqual(frozen);
  assertNative(await drawing(page), { ...initial, pool: 12 }); assertNative(await drawing(page, 'pinned'), initial);
  await expect(page.locator('[data-overlap-condition="current"]')).toHaveAttribute('data-overlap-feasible', 'false'); await expect(page.locator('[data-overlap-condition="pinned"]')).toHaveAttribute('data-overlap-feasible', 'true');
  await range(page, 'overlap', 4); assertNative(await drawing(page), { ...initial, pool: 12, overlap: 4 }); assertNative(await drawing(page, 'pinned'), { ...initial, overlap: 4 });
  const stable = await drawing(page); await page.getByRole('tab', { name: /Banding Stations/ }).click(); expect(await drawing(page)).toEqual(stable);
  await page.evaluate(() => (window as any).__ctx.setToolData((old: any) => ({ ...old, unrelatedRound20: 'kept', raptorHunt: { ...old.raptorHunt, unrelatedRound20: 'kept' } })));
  expect(await physical(page)).toEqual({ pool: 12, first: 8, second: 8 }); expect(await physical(page, 'pinned')).toEqual(frozen); expect(await drawing(page)).toEqual(stable);
  await expect(page.locator('[data-overlap-experiment="poolDouble"]')).toBeDisabled();
  for (const [kind, expected] of [ ['firstPlus', { pool: 24, first: 10, second: 8 }], ['secondPlus', { pool: 24, first: 8, second: 10 }], ['emptySecond', { pool: 24, first: 8, second: 0 }] ] as const) {
    await page.locator('[data-overlap-experiment="' + kind + '"]').click(); expect(await physical(page)).toEqual(expected); expect(await physical(page, 'pinned')).toEqual(frozen); await expect(page.locator('#rh-overlap-overlap')).toHaveValue('4');
    assertNative(await drawing(page), { ...initial, ...expected, overlap: 4 });
  }
  await page.locator('[data-overlap-answer="spread"]').click(); await expect(page.locator('.rh-overlap-feedback')).toContainText('Correct. The mean summarizes repeated random pairs');
  await page.locator('[data-overlap-reset]').click(); expect(await physical(page)).toEqual(frozen); expect(await physical(page, 'pinned')).toEqual(frozen); await expect(page.locator('#rh-overlap-overlap')).toHaveValue('4'); await expect(page.locator('.rh-overlap-feedback')).toHaveCount(0);
  await replace(page, { ...initial, pool: 13, first: 11, second: 12 }); await pin.click();
  for (const kind of ['poolHalf', 'firstPlus', 'secondPlus']) await expect(page.locator('[data-overlap-experiment="' + kind + '"]')).toBeDisabled();
  await page.locator('[data-overlap-experiment="poolDouble"]').click(); expect(await physical(page)).toEqual({ pool: 26, first: 11, second: 12 });
  await replace(page, { ...initial, pool: 12, first: 12, second: 0 }); await pin.click();
  for (const kind of ['poolHalf', 'firstPlus', 'emptySecond']) await expect(page.locator('[data-overlap-experiment="' + kind + '"]')).toBeDisabled();
  await page.locator('[data-overlap-experiment="secondPlus"]').click(); expect(await physical(page)).toEqual({ pool: 12, first: 12, second: 2 });
  await replace(page, { ...initial, pool: 36 }); await pin.click(); await expect(page.locator('[data-overlap-experiment="poolDouble"]')).toBeDisabled(); await page.locator('[data-overlap-experiment="poolHalf"]').click(); expect(await physical(page)).toEqual({ pool: 18, first: 8, second: 8 });
  await page.locator('[data-overlap-clear]').click(); await expect(pin).toBeFocused(); await expect(page.locator('[data-overlap-condition="pinned"]')).toHaveCount(0);
  await replace(page, { version: 1, pool: Infinity, first: '4', second: -99, overlap: 100.6 }); expect(await physical(page)).toEqual({ pool: 24, first: 8, second: 0 }); await expect(page.locator('#rh-overlap-overlap')).toHaveValue('12');
  await replace(page, { version: 1, pool: 12.49, first: 11.51, second: 2.49, overlap: 3.51 }); expect(await physical(page)).toEqual({ pool: 12, first: 12, second: 2 }); await expect(page.locator('#rh-overlap-overlap')).toHaveValue('4');
  await range(page, 'overlap', 5); const saved = await page.evaluate(() => (window as any).__toolData.raptorHunt.overlapStudy);
  expect(saved).toEqual({ version: 1, pool: 12, first: 12, second: 2, overlap: 5 });
  const host = await page.evaluate(() => (window as any).__toolData); expect(host.raptorHunt.xp).toBe(0); expect(host.unrelatedRound20).toBe('kept'); expect(host.raptorHunt.unrelatedRound20).toBe('kept');
  await harness.destroy(page); await mount(page, saved); expect(await physical(page)).toEqual({ pool: 12, first: 12, second: 2 }); await expect(page.locator('#rh-overlap-overlap')).toHaveValue('5'); await expect(page.locator('[data-overlap-condition="pinned"]')).toHaveCount(0);
  await replace(page, { version: 99, pool: 36, first: 0, second: 0, overlap: 12 }); expect(await physical(page)).toEqual({ pool: 24, first: 8, second: 8 }); await expect(page.locator('#rh-overlap-overlap')).toHaveValue('3');
});

test('sampling controls, overlap inspection and frozen comparisons support keyboard use with readable native figures and eight accessibility rules at three host widths', async ({ page }) => {
  await mount(page);
  for (const layout of [{ viewport: 1280, host: 1100 }, { viewport: 390, host: 390 }, { viewport: 1280, host: 500 }]) {
    await page.setViewportSize({ width: layout.viewport, height: 1000 });
    await page.locator('#wrap').evaluate((element: HTMLElement, width) => { element.style.width = width + 'px'; element.style.maxWidth = '100%'; element.setAttribute('data-stem-tool-shell', 'true'); }, layout.host);
    if (await page.locator('[data-overlap-condition="pinned"]').count()) await page.locator('[data-overlap-clear]').click(); await page.locator('[data-overlap-reset]').click();
    const pool = page.locator('#rh-overlap-pool'); await pool.focus(); await page.keyboard.press('End'); await page.keyboard.press('ArrowLeft'); await expect(pool).toHaveValue('35'); await expect(pool).toBeFocused(); await page.keyboard.press('Home'); await expect(pool).toHaveValue('12');
    const first = page.locator('#rh-overlap-first'); await first.focus(); await page.keyboard.press('End'); await expect(first).toHaveValue('12'); await page.keyboard.press('Home'); await expect(first).toHaveValue('0');
    const second = page.locator('#rh-overlap-second'); await second.focus(); await page.keyboard.press('End'); await page.keyboard.press('ArrowLeft'); await expect(second).toHaveValue('11');
    const overlap = page.locator('#rh-overlap-overlap'); await overlap.focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight'); await expect(overlap).toHaveValue('1'); await expect(overlap).toBeFocused();
    const reset = page.locator('[data-overlap-reset]'); await reset.focus(); await page.keyboard.press('Enter'); await expect(reset).toBeFocused(); await expect(overlap).toHaveValue('1'); await range(page, 'overlap', 4);
    const pin = page.locator('[data-overlap-pin]'); await pin.focus(); await page.keyboard.press('Enter'); await expect(pin).toBeFocused();
    const half = page.locator('[data-overlap-experiment="poolHalf"]'); await half.focus(); await page.keyboard.press('Enter'); await expect(half).toBeFocused();
    const answer = page.locator('[data-overlap-answer="spread"]'); await answer.focus(); await page.keyboard.press('Enter'); await expect(answer).toBeFocused(); await expect(page.locator('.rh-overlap-feedback')).toContainText('Correct.');
    const host = (await page.locator('#wrap').boundingBox())!;
    for (const selector of [root, '.rh-overlap-controls', '.rh-overlap-comparison', '.rh-overlap-evidence', '.rh-overlap-model', '[data-overlap-condition="current"]', '[data-overlap-condition="pinned"]']) {
      const node = page.locator(selector), box = (await node.boundingBox())!; expect(box.x).toBeGreaterThanOrEqual(host.x - 1); expect(box.x + box.width).toBeLessThanOrEqual(host.x + host.width + 1); expect(await node.evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
    }
    // Check both an ordinary diagram and the impossible-overlap overlay at
    // every size, including each actual SVG text box and transformed font.
    for (const inspected of [4, 3]) {
      await range(page, 'overlap', inspected);
      const labels = await page.locator(root + ' svg text').evaluateAll(nodes => nodes.map(node => {
        const text = node as SVGTextElement, box = text.getBBox(), view = text.ownerSVGElement!.viewBox.baseVal, matrix = text.getScreenCTM()!;
        return { text: text.textContent, left: box.x, right: box.x + box.width, top: box.y, bottom: box.y + box.height, width: view.width, height: view.height, font: parseFloat(getComputedStyle(text).fontSize) * Math.hypot(matrix.a, matrix.b) };
      }));
      for (const label of labels) { expect(label.left, label.text || '').toBeGreaterThanOrEqual(0); expect(label.right, label.text || '').toBeLessThanOrEqual(label.width); expect(label.top, label.text || '').toBeGreaterThanOrEqual(0); expect(label.bottom, label.text || '').toBeLessThanOrEqual(label.height); expect(label.font, label.text || '').toBeGreaterThanOrEqual(11); }
    }
    const violations = await page.evaluate(async () => (await (window as any).axe.run(document.querySelector('[data-raptor-overlap-study]'), { runOnly: { type: 'rule', values: ['color-contrast', 'button-name', 'select-name', 'label', 'aria-valid-attr-value', 'aria-required-children', 'aria-required-parent', 'nested-interactive'] } })).violations.map((item: any) => ({ id: item.id, nodes: item.nodes.map((node: any) => node.target) })));
    expect(violations).toEqual([]); expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  }
});
