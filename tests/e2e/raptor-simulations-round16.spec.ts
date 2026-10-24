import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off' });
test.describe.configure({ retries: 0, timeout: 180_000 });
const harness = new GlHarness({ toolId: 'raptorHunt', toolFile: 'stem_lab/stem_tool_raptorhunt.js', width: 1100, height: 1000,
  layout: 'document', appStyles: true, extraScripts: ['node_modules/axe-core/axe.min.js'] });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

type Model = { version: number; input: number; halfLife: number; stop: number; initial: number; day: number };
const initial: Model = { version: 1, input: 3, halfLife: 10, stop: 20, initial: 15, day: 30 };
// Independent coupled RK4 integration, not the production exponential solution
// or its residual formula for eliminated material. Steps split at the integer
// input boundary; each interval uses its constant forcing, including the left
// limit at its last RK stage. The reported instant rate at stop is then zero.
function integrate(model: Model) {
  const step = 1 / 128, k = Math.log(2) / model.halfLife;
  let b = model.initial, e = 0, input = 0;
  const samples = [{ b, e, input }];
  for (let index = 0; index < 60 * 128; index++) {
    const forcing = (index + .5) * step < model.stop ? model.input : 0;
    const f1 = forcing - k * b, b2 = b + step * f1 / 2, f2 = forcing - k * b2;
    const b3 = b + step * f2 / 2, f3 = forcing - k * b3, b4 = b + step * f3, f4 = forcing - k * b4;
    e += step * k / 6 * (b + 2 * b2 + 2 * b3 + b4);
    b += step / 6 * (f1 + 2 * f2 + 2 * f3 + f4); input += forcing * step;
    if ((index + 1) % 32 === 0) samples.push({ b, e, input });
  }
  return samples;
}
function scaleFor(current: Model, pinned?: Model) {
  const maximum = Math.max(1, current.initial + current.input * current.stop, pinned ? pinned.initial + pinned.input * pinned.stop : 0);
  return [1, 2, 5, 10, 20, 50, 100, 200, 500].find(value => value >= maximum)!;
}
async function mount(page: Page, retentionStudy?: any) {
  await page.setViewportSize({ width: 1280, height: 1000 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { raptorHunt: { activeSection: 'conservation', retentionStudy, xp: 0 } }, undefined, { expectCanvas: false });
  await expect(page.locator('[data-raptor-retention-study]')).toBeVisible();
}
async function replace(page: Page, model: Model) {
  await page.evaluate(value => (window as any).__ctx.setToolData((previous: any) => ({ ...previous, raptorHunt: { ...previous.raptorHunt, retentionStudy: value } })), model);
  await page.waitForFunction(value => Object.entries(value).filter(([key]) => key !== 'version').every(([key, number]) => (document.querySelector('#rh-retention-' + key) as HTMLInputElement)?.value === String(number)), model, { polling: 30 });
}
async function range(page: Page, key: string, value: number) {
  await page.locator('#rh-retention-' + key).evaluate((element: HTMLInputElement, next) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(element, String(next));
    element.dispatchEvent(new Event('input', { bubbles: true })); element.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
  await expect(page.locator('#rh-retention-' + key)).toHaveValue(String(value));
}
async function nativeDrawing(page: Page, key = 'current'): Promise<any> {
  return page.locator('[data-raptor-retention-study]').evaluate((root, key) => {
    const reservoir = root.querySelector('[data-retention-reservoir="' + key + '"]')!, fill = reservoir.querySelector<SVGRectElement>('[data-retention-fill]')!;
    const curve = root.querySelector('[data-retention-curve="' + key + '"]')!.getAttribute('d')!;
    const point = root.querySelector<SVGCircleElement>('[data-retention-point="' + key + '"]')!, stop = root.querySelector<SVGLineElement>('[data-retention-stop="' + key + '"]')!, inspector = root.querySelector<SVGLineElement>('[data-retention-inspector]')!;
    return { scale: Number(root.getAttribute('data-retention-scale')), curve: Array.from(curve.matchAll(/[ML]([-\d.]+) ([-\d.]+)/g), match => [Number(match[1]), Number(match[2])]),
      fill: [fill.x.baseVal.value, fill.y.baseVal.value, fill.width.baseVal.value, fill.height.baseVal.value],
      point: [point.cx.baseVal.value, point.cy.baseVal.value], stop: [stop.x1.baseVal.value, stop.y1.baseVal.value, stop.x2.baseVal.value, stop.y2.baseVal.value],
      inspector: [inspector.x1.baseVal.value, inspector.y1.baseVal.value, inspector.x2.baseVal.value, inspector.y2.baseVal.value],
      bars: ['initial', 'input', 'retained', 'eliminated'].map(name => { const bar = root.querySelector<SVGRectElement>('[data-retention-balance-bar="' + key + ':' + name + '"]')!;
        return { name, x: bar.x.baseVal.value, y: bar.y.baseVal.value, width: bar.width.baseVal.value, height: bar.height.baseVal.value, text: root.querySelector('[data-retention-balance-value="' + key + ':' + name + '"]')!.textContent }; }),
      rateIn: reservoir.querySelector('[data-retention-rate="' + key + ':in"]')!.textContent, rateOut: reservoir.querySelector('[data-retention-rate="' + key + ':out"]')!.textContent,
      amount: reservoir.querySelector('[data-retention-amount]')!.textContent, net: reservoir.querySelector('[data-retention-net]')!.textContent,
      arrows: ['in', 'out'].map(name => { const arrow = reservoir.querySelector('[data-retention-arrow="' + key + ':' + name + '"]')!;
        return { name, path: arrow.getAttribute('d'), stroke: getComputedStyle(arrow).stroke, dash: arrow.getAttribute('stroke-dasharray') }; }),
      phase: reservoir.querySelector('[data-retention-phase]')!.textContent,
      balance: root.querySelector('[data-retention-accounting="' + key + '"] [data-retention-balance]')!.textContent };
  }, key);
}
function inspect(drawing: any, model: Model, day: number, scale: number) {
  const samples = integrate(model), sample = samples[day * 4], k = Math.log(2) / model.halfLife, rateIn = day < model.stop ? model.input : 0, rateOut = k * sample.b, errors: string[] = [];
  function near(actual: number, expected: number, label: string, tolerance = .0001) { if (!Number.isFinite(actual) || Math.abs(actual - expected) > tolerance) errors.push(label + ': ' + actual + ' versus ' + expected); }
  function reading(text: string, expected: number, label: string) {
    const bare = text.replace(/ u$/, '');
    if (Math.abs(expected) > 0 && Math.abs(expected) < .001) { if (bare !== (expected < 0 ? '−' : '') + '<0.001') errors.push(label + ' small positive/signed reading'); }
    else near(Number(bare.replace(/,/g, '')), expected, label, .000501);
  }
  near(drawing.scale, scale, 'shared complete-budget scale');
  if (drawing.curve.length !== 241) errors.push('241 quarter-day curve vertices');
  drawing.curve.forEach((point: number[], index: number) => { near(point[0], 66 + index / 240 * 526, 'curve x ' + index, .00051); near(point[1], 240 - samples[index].b / scale * 180, 'curve y ' + index, .00051); });
  // Native SVGAnimatedLength geometry uses Float32 storage. The serialized
  // paths above are separately checked against their .001 SVG-unit grid.
  [244, 266 - sample.b / scale * 188, 152, sample.b / scale * 188].forEach((value, index) => near(drawing.fill[index], value, 'reservoir ' + index));
  [66 + day / 60 * 526, 240 - sample.b / scale * 180].forEach((value, index) => near(drawing.point[index], value, 'selected point ' + index));
  [66 + model.stop / 60 * 526, 42, 66 + model.stop / 60 * 526, 240].forEach((value, index) => near(drawing.stop[index], value, 'stop guide ' + index));
  [66 + day / 60 * 526, 42, 66 + day / 60 * 526, 240].forEach((value, index) => near(drawing.inspector[index], value, 'shared inspector ' + index));
  const values = { initial: model.initial, input: sample.input, retained: sample.b, eliminated: sample.e };
  drawing.bars.forEach((bar: any, index: number) => { near(bar.x, 24, 'bar x'); near(bar.y, 55 + index * 57, 'bar y'); near(bar.height, 12, 'bar height'); near(bar.width, values[bar.name as keyof typeof values] / scale * 586, 'amount bar ' + bar.name); reading(bar.text, values[bar.name as keyof typeof values], 'amount reading ' + bar.name); });
  reading(drawing.amount, sample.b, 'retained amount'); reading(drawing.rateIn, rateIn, 'instant input rate'); reading(drawing.rateOut, rateOut, 'instant leaving rate');
  reading(drawing.net.replace('Instantaneous change: ', '').replace(' u/day. Arrows show connections; their thickness does not encode rate.', ''), rateIn - rateOut, 'instant net rate');
  const inputArrow = drawing.arrows.find((arrow: any) => arrow.name === 'in'), outputArrow = drawing.arrows.find((arrow: any) => arrow.name === 'out');
  if (inputArrow.path !== 'M167 164H228m-9-7 9 7-9 7' || outputArrow.path !== 'M412 164H473m-9-7 9 7-9 7') errors.push('native directional connections');
  if (inputArrow.stroke !== (rateIn ? 'rgb(165, 224, 199)' : 'rgb(154, 171, 145)') || inputArrow.dash !== (rateIn ? null : '3 5') || outputArrow.stroke !== 'rgb(228, 206, 158)') errors.push('rendered rate phase styling');
  if (!drawing.phase.startsWith(rateIn ? 'Input is on.' : 'Input is off.')) errors.push('input schedule phase');
  const fromFill = drawing.fill[3] / 188 * scale, fromBars = Object.fromEntries(drawing.bars.map((bar: any) => [bar.name, bar.width / 586 * scale]));
  near(fromFill + fromBars.eliminated, fromBars.initial + fromBars.input, 'native amount conservation', scale * 1e-6);
  if (!drawing.balance.includes('Eliminated means left this compartment, not destroyed or shown to be harmless.')) errors.push('elimination interpretation');
  return errors;
}
async function checked(page: Page, model: Model, day: number, scale: number, key = 'current') {
  let drawing: any;
  // Global reduced-motion CSS assigns even SVG strokes a short transition.
  // Wait for exact phase colors; preserve all independent geometry checks.
  await expect.poll(async () => { drawing = await nativeDrawing(page, key); return inspect(drawing, model, day, scale).filter(error => error === 'rendered rate phase styling'); }).toEqual([]);
  return inspect(drawing, model, day, scale);
}

test('independent coupled RK4 integration matches native reservoir, balance and trajectory geometry at input boundaries and zero/extreme conditions', async ({ page }) => {
  await mount(page);
  const errors: string[] = [];
  for (const model of [initial, { ...initial, day: 0 }, { ...initial, day: 19.5 }, { ...initial, day: 20 }, { ...initial, day: 20.5 },
    { ...initial, input: 5, stop: 0, initial: 80, day: 10 }, { ...initial, input: 0, halfLife: 1, initial: 50, stop: 40, day: 60 },
    { ...initial, input: 0, initial: 0, stop: 0, day: 0 }, { ...initial, input: 5, halfLife: 30, stop: 40, initial: 100, day: 60 },
    { ...initial, input: .25, halfLife: 1, stop: 40, initial: 100, day: .5 }]) {
    await replace(page, model); errors.push(...(await checked(page, model, model.day, scaleFor(model))).map(error => JSON.stringify(model) + ': ' + error));
  }
  expect(errors).toEqual([]);
  await replace(page, initial); await page.locator('[data-retention-at-stop]').click(); await expect(page.locator('#rh-retention-day')).toHaveValue('20');
  await expect(page.locator('[data-retention-rate="current:in"]')).toHaveText('0.000');
  const atStop = await nativeDrawing(page), stopAmount = atStop.fill[3] / 188 * atStop.scale;
  await page.locator('[data-retention-after-half]').click(); await expect(page.locator('#rh-retention-day')).toHaveValue('30');
  const afterHalf = await nativeDrawing(page); expect(Math.abs(afterHalf.fill[3] / 188 * afterHalf.scale - stopAmount / 2)).toBeLessThan(.00002);
  await page.getByText('Read the exact model, boundaries, and research context').click(); const root = page.locator('[data-raptor-retention-study]');
  await expect(root).toContainText('at t = stop and afterward it is exactly zero'); await expect(root).toContainText('initial amount also decays');
  await expect(root).toContainText('B is continuous at the stop'); await expect(root).toContainText('not concentration');
  await expect(root).toContainText('models no real chemical or species, DDT kinetics');
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('frozen physical settings, exact one-factor experiments, shared cursor/scales and bounded persistent inputs remain isolated without progress awards', async ({ page }) => {
  await mount(page); await page.locator('[data-retention-pin]').click();
  const pin = initial, settings = await page.locator('[data-retention-pinned-settings]').textContent(), frozenCurve = await page.locator('[data-retention-curve="pinned"]').getAttribute('d');
  await page.locator('[data-retention-experiment="double-half"]').click(); const doubled = { ...initial, halfLife: 20 };
  expect(await checked(page, doubled, 30, scaleFor(doubled, pin))).toEqual([]); expect(await checked(page, pin, 30, scaleFor(doubled, pin), 'pinned')).toEqual([]);
  expect(await page.locator('[data-retention-curve="pinned"]').getAttribute('d')).toBe(frozenCurve);
  await range(page, 'input', 5); await range(page, 'initial', 100); await page.locator('[data-retention-experiment="earlier-stop"]').click();
  const earlier = { ...initial, stop: 10 };
  expect(await page.evaluate(() => (window as any).__toolData.raptorHunt.retentionStudy)).toEqual(earlier);
  expect(await checked(page, earlier, 30, scaleFor(earlier, pin))).toEqual([]); expect(await page.locator('[data-retention-pinned-settings]').textContent()).toBe(settings);
  const scale = await page.locator('[data-raptor-retention-study]').getAttribute('data-retention-scale');
  for (const day of [0, 10, 20, 60]) {
    await range(page, 'day', day); expect(await page.locator('[data-raptor-retention-study]').getAttribute('data-retention-scale')).toBe(scale);
    expect(await checked(page, earlier, day, scaleFor(earlier, pin))).toEqual([]); expect(await checked(page, pin, day, scaleFor(earlier, pin), 'pinned')).toEqual([]);
  }
  await page.evaluate(() => (window as any).__ctx.setToolData((previous: any) => ({ ...previous, raptorHunt: { ...previous.raptorHunt, statusSort: 'name' } })));
  expect(await page.locator('[data-retention-pinned-settings]').textContent()).toBe(settings);
  await range(page, 'halfLife', 30); await range(page, 'stop', 5); await page.locator('[data-retention-pin]').click();
  for (const action of ['double-half', 'earlier-stop']) await expect(page.locator('[data-retention-experiment="' + action + '"]')).toBeDisabled();
  const before = await page.evaluate(() => JSON.stringify((window as any).__toolData.raptorHunt.retentionStudy));
  await page.locator('[data-retention-experiment="double-half"]').evaluate((button: HTMLButtonElement) => button.click()); expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.raptorHunt.retentionStudy))).toBe(before);
  await range(page, 'stop', 40); await expect(page.locator('[data-retention-after-half]')).toBeDisabled();
  await page.locator('[data-retention-answer="yes"]').click(); await expect(page.locator('.rh-retention-feedback')).toContainText('no toxicity or safety threshold');
  await page.locator('[data-retention-answer="limits"]').click(); await expect(page.locator('.rh-retention-feedback')).toContainText('does not establish harm or safety');
  await page.locator('[data-retention-reset]').click(); await expect(page.locator('#rh-retention-day')).toHaveValue('60'); await expect(page.locator('#rh-retention-halfLife')).toHaveValue('10'); await expect(page.locator('.rh-retention-feedback')).toHaveCount(0);
  await page.locator('[data-retention-clear-pin]').click(); await expect(page.locator('[data-retention-reservoir="pinned"]')).toHaveCount(0); await page.locator('[data-retention-pin]').click();
  await page.evaluate(() => (window as any).__ctx.setToolData((previous: any) => ({ ...previous, raptorHunt: { ...previous.raptorHunt, activeSection: 'hub' } })));
  await expect(page.locator('[data-raptor-retention-study]')).toHaveCount(0);
  await page.evaluate(() => (window as any).__ctx.setToolData((previous: any) => ({ ...previous, raptorHunt: { ...previous.raptorHunt, activeSection: 'conservation' } })));
  await expect(page.locator('#rh-retention-day')).toHaveValue('60'); await expect(page.locator('[data-retention-reservoir="pinned"]')).toHaveCount(0);
  await page.evaluate(() => (window as any).__ctx.setToolData((previous: any) => ({ ...previous, raptorHunt: { ...previous.raptorHunt, retentionStudy: { version: 1, input: '4', halfLife: 0, stop: 999, initial: Infinity, day: 999 } } })));
  for (const [key, value] of Object.entries({ input: 3, halfLife: 1, stop: 40, initial: 15, day: 60 })) await expect(page.locator('#rh-retention-' + key)).toHaveValue(String(value));
  await range(page, 'input', 4); expect(await page.evaluate(() => (window as any).__toolData.raptorHunt.retentionStudy)).toEqual({ version: 1, input: 4, halfLife: 1, stop: 40, initial: 15, day: 60 });
  await page.locator('[data-retention-reset]').click(); await page.getByText('Explore the original conservation and DDT reference').click();
  await expect(page.getByRole('table', { name: 'Conservation status table', exact: true })).toBeVisible();
  expect(await page.evaluate(() => (window as any).__toolData.raptorHunt.xp)).toBe(0); expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('manual retention controls and current/frozen diagrams remain keyboard accessible and readable at desktop, phone and embedded widths', async ({ page }) => {
  await mount(page); const root = page.locator('[data-raptor-retention-study]'), before = await root.innerHTML();
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))); expect(await root.innerHTML()).toBe(before);
  await page.locator('[data-retention-pin]').focus(); await page.keyboard.press('Enter'); await expect(page.locator('[data-retention-reservoir="pinned"]')).toBeVisible();
  for (const layout of [{ viewport: 1280, host: 1100 }, { viewport: 390, host: 390 }, { viewport: 1280, host: 500 }]) {
    await page.setViewportSize({ width: layout.viewport, height: 1000 });
    await page.locator('#wrap').evaluate((element: HTMLElement, width) => { element.style.width = width + 'px'; element.style.maxWidth = '100%'; }, layout.host);
    await page.locator('#rh-retention-input').focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight'); await expect(page.locator('#rh-retention-input')).toHaveValue('0.25'); await expect(page.locator('#rh-retention-input')).toBeFocused();
    await page.locator('#rh-retention-halfLife').focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight'); await expect(page.locator('#rh-retention-halfLife')).toHaveValue('2');
    await page.locator('#rh-retention-stop').focus(); await page.keyboard.press('End'); await expect(page.locator('#rh-retention-stop')).toHaveValue('40');
    await page.locator('#rh-retention-day').focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight'); await expect(page.locator('#rh-retention-day')).toHaveValue('0.5'); await expect(page.locator('#rh-retention-day')).toBeFocused();
    await page.locator('[data-retention-at-stop]').focus(); await page.keyboard.press('Enter'); await expect(page.locator('#rh-retention-day')).toHaveValue('40'); await expect(page.locator('[data-retention-at-stop]')).toBeFocused();
    await page.locator('[data-retention-after-half]').focus(); await page.keyboard.press('Space'); await expect(page.locator('#rh-retention-day')).toHaveValue('42'); await expect(page.locator('[data-retention-after-half]')).toBeFocused();
    const host = (await page.locator('#wrap').boundingBox())!;
    for (const selector of ['[data-raptor-retention-study]', '[data-retention-trajectory]', '[data-retention-reservoir="current"]', '[data-retention-accounting="current"]', '.rh-retention-controls', '.rh-retention-compare', '.rh-retention-evidence', '[data-retention-reservoir="pinned"]', '[data-retention-accounting="pinned"]']) {
      const element = page.locator(selector), box = (await element.boundingBox())!;
      expect(box.x, selector).toBeGreaterThanOrEqual(host.x - 1); expect(box.x + box.width, selector).toBeLessThanOrEqual(host.x + host.width + 1);
      expect(await element.evaluate(node => node.scrollWidth - node.clientWidth), selector).toBeLessThanOrEqual(1);
    }
    for (const selector of ['[data-retention-trajectory] svg', '[data-retention-reservoir="current"] svg', '[data-retention-accounting="current"] svg', '[data-retention-reservoir="pinned"] svg', '[data-retention-accounting="pinned"] svg']) expect((await page.locator(selector).boundingBox())!.width, selector).toBeGreaterThan(280);
    expect(await page.evaluate(async () => {
      const report = await (window as any).axe.run(document.querySelector('[data-raptor-retention-study]'), { runOnly: { type: 'rule', values: ['color-contrast', 'button-name', 'select-name', 'label', 'aria-valid-attr-value', 'aria-required-children', 'aria-required-parent', 'nested-interactive'] } });
      return report.violations.map((item: any) => ({ id: item.id, targets: item.nodes.map((node: any) => node.target) }));
    })).toEqual([]);
  }
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
