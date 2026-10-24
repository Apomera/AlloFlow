import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off' });
test.describe.configure({ retries: 0, timeout: 180_000 });
const harness = new GlHarness({ toolId: 'raptorHunt', toolFile: 'stem_lab/stem_tool_raptorhunt.js', width: 1100, height: 1000,
  layout: 'document', appStyles: true, extraScripts: ['node_modules/axe-core/axe.min.js'] });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

type Model = { version: number; recruitment: number; juvenileSurvival: number; adultSurvival: number; total: number; juvenilePercent: number; year: number };
const initial: Model = { version: 1, recruitment: .6, juvenileSurvival: 40, adultSurvival: 85, total: 100, juvenilePercent: 40, year: 1 };
type Matrix = [number, number, number, number];
// Independent matrix exponentiation by squaring, rather than the production
// model's step-by-step cohort recurrence. Units are expected females at census.
function multiply(a: Matrix, b: Matrix): Matrix { return [a[0] * b[0] + a[1] * b[2], a[0] * b[1] + a[1] * b[3], a[2] * b[0] + a[3] * b[2], a[2] * b[1] + a[3] * b[3]]; }
function population(model: Model, year: number) {
  let power: Matrix = [0, model.recruitment, model.juvenileSurvival / 100, model.adultSurvival / 100], result: Matrix = [1, 0, 0, 1], exponent = year;
  while (exponent) { if (exponent % 2) result = multiply(result, power); power = multiply(power, power); exponent = Math.floor(exponent / 2); }
  const j0 = model.total * model.juvenilePercent / 100, a0 = model.total - j0;
  const j = result[0] * j0 + result[1] * a0, a = result[2] * j0 + result[3] * a0;
  return { j, a, total: j + a };
}
function commonScale(current: Model, pinned?: Model) {
  const maximum = Math.max(1, ...[current, ...(pinned ? [pinned] : [])].flatMap(model => Array.from({ length: 21 }, (_, year) => population(model, year).total)));
  return Array.from({ length: 10 }, (_, exponent) => [1, 2, 5].map(multiplier => multiplier * 10 ** exponent)).flat().find(value => value >= maximum)!;
}
function count(value: number) { return value > 0 && value < .01 ? '<0.01' : value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
async function mount(page: Page, cohortStudy?: any) {
  await page.setViewportSize({ width: 1280, height: 1000 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { raptorHunt: { activeSection: 'demographics', cohortStudy, xp: 0 } }, undefined, { expectCanvas: false });
  await expect(page.locator('[data-raptor-cohort-study]')).toBeVisible();
}
async function replace(page: Page, model: Model) {
  await page.evaluate(value => (window as any).__ctx.setToolData((previous: any) => ({ ...previous, raptorHunt: { ...previous.raptorHunt, cohortStudy: value } })), model);
  await page.waitForFunction(value => Object.entries(value).filter(([key]) => key !== 'version').every(([key, number]) => (document.querySelector('#rh-cohort-' + key) as HTMLInputElement)?.value === String(number)), model, { polling: 30 });
}
async function range(page: Page, key: string, value: number) {
  await page.locator('#rh-cohort-' + key).evaluate((element: HTMLInputElement, next) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(element, String(next));
    element.dispatchEvent(new Event('input', { bubbles: true })); element.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
  await expect(page.locator('#rh-cohort-' + key)).toHaveValue(String(value));
}
async function nativeDrawing(page: Page, key = 'current'): Promise<any> {
  return page.locator('[data-raptor-cohort-study]').evaluate((root, key) => {
    const flow = root.querySelector('[data-cohort-flow="' + key + '"]')!, curve = root.querySelector('[data-cohort-curve="' + key + '"]')!.getAttribute('d')!;
    const point = root.querySelector<SVGCircleElement>('[data-cohort-point="' + key + '"]')!, guide = root.querySelector<SVGLineElement>('[data-cohort-step-guide]')!;
    return { key, hasPin: !!root.querySelector('[data-cohort-flow="pinned"]'), scale: Number(root.getAttribute('data-cohort-scale')), curve: Array.from(curve.matchAll(/[ML]([-\d.]+) ([-\d.]+)/g), match => ({ x: Number(match[1]), y: Number(match[2]) })),
      point: [point.cx.baseVal.value, point.cy.baseVal.value], guide: [guide.x1.baseVal.value, guide.y1.baseVal.value, guide.x2.baseVal.value, guide.y2.baseVal.value],
      stocks: ['J', 'A'].map(stage => { const bar = root.querySelector<SVGRectElement>('[data-cohort-stock="' + key + ':' + stage + '"]')!;
        return { stage, x: bar.x.baseVal.value, y: bar.y.baseVal.value, height: bar.height.baseVal.value, width: bar.width.baseVal.value, fill: getComputedStyle(bar).fill }; }),
      interval: !flow.querySelector('[data-cohort-no-interval]'),
      contributions: [...flow.querySelectorAll<SVGRectElement>('[data-cohort-contribution-bar]')].map(bar => { const name = bar.getAttribute('data-cohort-contribution-bar')!.split(':')[1];
        return { name, x: bar.x.baseVal.value, y: bar.y.baseVal.value, width: bar.width.baseVal.value, height: bar.height.baseVal.value,
          link: flow.querySelector('[data-cohort-link="' + key + ':' + name + '"]')!.getAttribute('d'), reading: flow.querySelector('[data-cohort-contribution-value="' + key + ':' + name + '"]')!.textContent }; }),
      losses: ['J', 'A'].map(stage => flow.querySelector('[data-cohort-loss="' + key + ':' + stage + '"]')?.textContent ?? null),
      readingJ: root.querySelector('[data-cohort-reading="' + key + ':J"]')!.textContent, readingA: root.querySelector('[data-cohort-reading="' + key + ':A"]')!.textContent,
      balance: flow.querySelector('[data-cohort-balance]')?.textContent ?? null };
  }, key);
}
function inspect(drawing: any, model: Model, year: number, scale: number) {
  const errors: string[] = [], selected = population(model, year), near = (actual: number, expected: number, label: string, tolerance = .0001) => { if (!Number.isFinite(actual) || Math.abs(actual - expected) > tolerance) errors.push(label + ': ' + actual + ' versus ' + expected); };
  near(drawing.scale, scale, 'shared scale');
  if (drawing.curve.length !== 21) errors.push('twenty-one native census points');
  drawing.curve.forEach((point: any, step: number) => { near(point.x, 66 + step / 20 * 526, 'native path x ' + step, .00051); near(point.y, 240 - population(model, step).total / scale * 180, 'native path y ' + step, .00051); });
  near(drawing.point[0], 66 + year / 20 * 526, 'selected point x'); near(drawing.point[1], 240 - selected.total / scale * 180, 'selected point y');
  [66 + year / 20 * 526, 44, 66 + year / 20 * 526, 240].forEach((expected, index) => near(drawing.guide[index], expected, 'guide ' + index));
  // Native SVGAnimatedLength values use Float32 storage; parsed paths above
  // instead use the renderer's explicit .001 SVG-unit quantization.
  drawing.stocks.forEach((bar: any) => { const value = bar.stage === 'J' ? selected.j : selected.a;
    near(bar.x, drawing.key === 'pinned' ? 394 : drawing.hasPin ? 154 : 274, 'stage bar x');
    near(bar.height, value / scale * 180, 'stage bar height ' + bar.stage); near(bar.y, 222 - (bar.stage === 'J' ? selected.j : selected.total) / scale * 180, 'stage bar y ' + bar.stage); near(bar.width, 92, 'stage bar width');
    if (bar.fill !== (bar.stage === 'J' ? 'rgb(239, 210, 153)' : 'rgb(155, 216, 192)')) errors.push('stage fill ' + bar.stage); });
  if (drawing.readingJ !== 'J ' + count(selected.j) || drawing.readingA !== 'A ' + count(selected.a)) errors.push('stage readings');
  if (!year) { if (drawing.interval || drawing.contributions.length || drawing.balance !== null) errors.push('initial census has no preceding interval'); return errors; }
  if (!drawing.interval || drawing.contributions.length !== 3) errors.push('three separate contribution links');
  const before = population(model, year - 1), flows = { entrants: model.recruitment * before.a, juvenile: model.juvenileSurvival / 100 * before.j, adult: model.adultSurvival / 100 * before.a };
  const lossJ = (1 - model.juvenileSurvival / 100) * before.j, lossA = (1 - model.adultSurvival / 100) * before.a;
  ['entrants', 'juvenile', 'adult'].forEach((name, index) => { const bar = drawing.contributions.find((item: any) => item.name === name), value = flows[name as keyof typeof flows], y = 68 + index * 94;
    if (!bar) return errors.push('missing ' + name);
    near(bar.x, 154, 'contribution x'); near(bar.y, y + 17, 'contribution y'); near(bar.height, 9, 'contribution height'); near(bar.width, value / scale * 292, 'contribution amount ' + name);
    if (bar.reading !== count(value) || bar.link !== 'M110 ' + y + 'H488m-10-7 10 7-10 7') errors.push('native contribution reading/link ' + name);
  });
  if (drawing.losses[0] !== 'J: ' + count(lossJ) || drawing.losses[1] !== 'A: ' + count(lossA)) errors.push('old cohort losses');
  const balance = count(before.total) + ' previous − ' + count(lossJ + lossA) + ' old-cohort losses + ' + count(flows.entrants) + ' new entrants = ' + count(selected.total) + ' expected females. Values shown are rounded.';
  if (drawing.balance !== balance) errors.push('population accounting');
  // Recruitment adds individuals without consuming adult parents.
  if (Math.abs(selected.total - (before.total - lossJ - lossA + flows.entrants)) > 1e-8 * Math.max(1, selected.total)) errors.push('independent accounting identity');
  return errors;
}

test('independent matrix powers match native census curves, stage bars, contribution links and losses at initial, zero, declining and maximal twenty-step conditions', async ({ page }) => {
  await mount(page);
  const errors: string[] = [];
  for (const model of [initial, { ...initial, year: 0 }, { ...initial, recruitment: 1.5, juvenileSurvival: 100, adultSurvival: 100, total: 200, juvenilePercent: 50, year: 20 },
    { ...initial, recruitment: 0, juvenileSurvival: 0, adultSurvival: 0 }, { ...initial, recruitment: 1.5, juvenileSurvival: 0, adultSurvival: 100, juvenilePercent: 0 },
    { ...initial, recruitment: 0, juvenileSurvival: 100, adultSurvival: 0, juvenilePercent: 100 }, { ...initial, recruitment: .05, juvenileSurvival: 5, adultSurvival: 5, total: 10, juvenilePercent: 50, year: 20 },
    { ...initial, total: 0, recruitment: 1.5, juvenileSurvival: 100, adultSurvival: 100, year: 20 }]) {
    await replace(page, model);
    // The global reduced-motion rule gives SVG fills a nonzero transition
    // duration. Poll the same strict native checks until the rendered state settles.
    let drawing: any;
    await expect.poll(async () => { drawing = await nativeDrawing(page); return inspect(drawing, model, model.year, commonScale(model)).filter(error => error.startsWith('stage fill')); }).toEqual([]);
    errors.push(...inspect(drawing, model, model.year, commonScale(model)).map(error => JSON.stringify(model) + ': ' + error));
  }
  expect(errors).toEqual([]);
  const parentRetention = { ...initial, recruitment: 1.5, juvenileSurvival: 0, adultSurvival: 100, juvenilePercent: 0 };
  await replace(page, parentRetention); await expect(page.locator('[data-cohort-reading="current:A"]')).toHaveText('A 100.00');
  await expect(page.locator('[data-cohort-reading="current:J"]')).toHaveText('J 150.00'); await expect(page.locator('[data-cohort-stock-total="current"]')).toHaveText('250.00');
  await page.getByText('Read the census convention, model, and source').click();
  const root = page.locator('[data-raptor-cohort-study]'); await expect(root).toContainText('not raw clutch size or a probability');
  await expect(root).toContainText('not multiplied by adult survival again'); await expect(root).toContainText('not actual raptor maturation');
  await expect(root).toContainText('not a count of individual outcomes or an extinction probability');
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('same-total composition experiments, frozen rates and starting cohorts, shared-step scales, bounded saved inputs and interpretation remain isolated', async ({ page }) => {
  await mount(page); await page.locator('[data-cohort-composition="juvenile"]').click(); await page.locator('[data-cohort-pin]').click();
  const pinned = { ...initial, juvenilePercent: 100 }, summary = await page.locator('[data-cohort-pinned-summary]').textContent();
  await page.locator('[data-cohort-composition="adult"]').click(); const adult = { ...initial, juvenilePercent: 0 };
  expect(inspect(await nativeDrawing(page), adult, 1, commonScale(adult, pinned))).toEqual([]);
  expect(inspect(await nativeDrawing(page, 'pinned'), pinned, 1, commonScale(adult, pinned))).toEqual([]);
  await expect(page.locator('[data-cohort-stock-total="current"]')).toHaveText('145.00'); await expect(page.locator('[data-cohort-stock-total="pinned"]')).toHaveText('40.00');
  await expect(page.locator('#rh-cohort-total')).toHaveValue('100'); await expect(page.locator('#rh-cohort-recruitment')).toHaveValue('0.6');
  const scaleBefore = await page.locator('[data-raptor-cohort-study]').getAttribute('data-cohort-scale');
  for (const year of [0, 1, 5, 20]) {
    await range(page, 'year', year); expect(await page.locator('[data-raptor-cohort-study]').getAttribute('data-cohort-scale')).toBe(scaleBefore);
    expect(inspect(await nativeDrawing(page), adult, year, commonScale(adult, pinned))).toEqual([]);
    expect(inspect(await nativeDrawing(page, 'pinned'), pinned, year, commonScale(adult, pinned))).toEqual([]);
    expect(await page.locator('[data-cohort-pinned-summary]').textContent()).toBe(summary);
  }
  await expect(page.locator('[data-cohort-next]')).toBeDisabled(); await range(page, 'year', 0); await expect(page.locator('[data-cohort-previous]')).toBeDisabled();
  await range(page, 'recruitment', 1.5); await range(page, 'adultSurvival', 100); await range(page, 'juvenileSurvival', 100); await range(page, 'total', 200); await range(page, 'year', 20);
  const changed = { ...adult, recruitment: 1.5, juvenileSurvival: 100, adultSurvival: 100, total: 200, year: 20 };
  expect(inspect(await nativeDrawing(page, 'pinned'), pinned, 20, commonScale(changed, pinned))).toEqual([]); expect(await page.locator('[data-cohort-pinned-summary]').textContent()).toBe(summary);
  expect(await page.evaluate(() => (window as any).__toolData.raptorHunt.cohortStudy)).toEqual(changed);
  await page.evaluate(() => (window as any).__ctx.setToolData((previous: any) => ({ ...previous, raptorHunt: { ...previous.raptorHunt, demoTab: 'concepts' } })));
  expect(await page.locator('[data-cohort-pinned-summary]').textContent()).toBe(summary);
  await page.locator('[data-cohort-answer="yes"]').click(); await expect(page.locator('.rh-cohort-feedback')).toContainText('does not identify an effective real action');
  await page.locator('[data-cohort-answer="limits"]').click(); await expect(page.locator('.rh-cohort-feedback')).toContainText('ranks no real conservation action');
  await page.locator('[data-cohort-pin]').click(); expect(await page.locator('[data-cohort-pinned-summary]').textContent()).not.toBe(summary);
  await page.locator('[data-cohort-clear-pin]').click(); await expect(page.locator('[data-cohort-flow="pinned"]')).toHaveCount(0); await page.locator('[data-cohort-pin]').click();
  await page.evaluate(() => (window as any).__ctx.setToolData((previous: any) => ({ ...previous, raptorHunt: { ...previous.raptorHunt, activeSection: 'hub' } })));
  await expect(page.locator('[data-raptor-cohort-study]')).toHaveCount(0);
  await page.evaluate(() => (window as any).__ctx.setToolData((previous: any) => ({ ...previous, raptorHunt: { ...previous.raptorHunt, activeSection: 'demographics' } })));
  await expect(page.locator('#rh-cohort-year')).toHaveValue('20'); await expect(page.locator('#rh-cohort-total')).toHaveValue('200'); await expect(page.locator('[data-cohort-flow="pinned"]')).toHaveCount(0);
  await page.evaluate(() => (window as any).__ctx.setToolData((previous: any) => ({ ...previous, raptorHunt: { ...previous.raptorHunt, cohortStudy: {
    version: 1, recruitment: NaN, juvenileSurvival: Infinity, adultSurvival: -20, total: 999, juvenilePercent: '50', year: 999 } } })));
  for (const [key, value] of Object.entries({ recruitment: .6, juvenileSurvival: 40, adultSurvival: 0, total: 200, juvenilePercent: 40, year: 20 })) await expect(page.locator('#rh-cohort-' + key)).toHaveValue(String(value));
  await range(page, 'adultSurvival', 85); expect(await page.evaluate(() => (window as any).__toolData.raptorHunt.cohortStudy)).toEqual({ ...initial, total: 200, year: 20 });
  await page.locator('[data-cohort-reset]').click(); expect(await page.evaluate(() => (window as any).__toolData.raptorHunt.cohortStudy)).toEqual(initial);
  await page.getByText('Explore the original demographics and life-history reference').click(); await page.getByRole('button', { name: '📊 Life History Table', exact: true }).click(); await expect(page.locator('.rh-life-workbench')).toBeVisible();
  expect(await page.evaluate(() => (window as any).__toolData.raptorHunt.xp)).toBe(0); expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('manual census and parameter controls retain keyboard focus with readable diagrams at desktop, phone and embedded widths', async ({ page }) => {
  await mount(page);
  const root = page.locator('[data-raptor-cohort-study]'), before = await root.innerHTML();
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))); expect(await root.innerHTML()).toBe(before);
  await page.locator('[data-cohort-pin]').focus(); await page.keyboard.press('Enter'); await expect(page.locator('[data-cohort-flow="pinned"]')).toBeVisible();
  for (const layout of [{ viewport: 1280, host: 1100 }, { viewport: 390, host: 390 }, { viewport: 1280, host: 500 }]) {
    await page.setViewportSize({ width: layout.viewport, height: 1000 });
    await page.locator('#wrap').evaluate((element: HTMLElement, width) => { element.style.width = width + 'px'; element.style.maxWidth = '100%'; }, layout.host);
    await page.locator('#rh-cohort-recruitment').focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight'); await expect(page.locator('#rh-cohort-recruitment')).toHaveValue('0.05'); await expect(page.locator('#rh-cohort-recruitment')).toBeFocused();
    await page.locator('#rh-cohort-juvenileSurvival').focus(); await page.keyboard.press('End'); await expect(page.locator('#rh-cohort-juvenileSurvival')).toHaveValue('100');
    await page.locator('#rh-cohort-year').focus(); await page.keyboard.press('Home'); await expect(page.locator('#rh-cohort-year')).toHaveValue('0');
    await page.locator('[data-cohort-next]').focus(); await page.keyboard.press('Enter'); await expect(page.locator('#rh-cohort-year')).toHaveValue('1'); await expect(page.locator('[data-cohort-next]')).toBeFocused();
    await page.locator('[data-cohort-composition="equal"]').focus(); await page.keyboard.press('Space'); await expect(page.locator('#rh-cohort-juvenilePercent')).toHaveValue('50'); await expect(page.locator('[data-cohort-composition="equal"]')).toBeFocused();
    const host = (await page.locator('#wrap').boundingBox())!;
    for (const selector of ['[data-raptor-cohort-study]', '[data-cohort-trajectory]', '[data-cohort-stocks]', '[data-cohort-flow="current"]', '.rh-cohort-controls', '.rh-cohort-compare', '.rh-cohort-evidence', '[data-cohort-flow="pinned"]']) {
      const element = page.locator(selector), box = (await element.boundingBox())!;
      expect(box.x, selector).toBeGreaterThanOrEqual(host.x - 1); expect(box.x + box.width, selector).toBeLessThanOrEqual(host.x + host.width + 1);
      expect(await element.evaluate(node => node.scrollWidth - node.clientWidth), selector).toBeLessThanOrEqual(1);
    }
    for (const selector of ['[data-cohort-trajectory] svg', '[data-cohort-stocks] svg', '[data-cohort-flow="current"] svg', '[data-cohort-flow="pinned"] svg']) expect((await page.locator(selector).boundingBox())!.width, selector).toBeGreaterThan(280);
    expect(await page.evaluate(async () => {
      const report = await (window as any).axe.run(document.querySelector('[data-raptor-cohort-study]'), { runOnly: { type: 'rule', values: ['color-contrast', 'button-name', 'select-name', 'label', 'aria-valid-attr-value', 'aria-required-children', 'aria-required-parent', 'nested-interactive'] } });
      return report.violations.map((item: any) => ({ id: item.id, targets: item.nodes.map((node: any) => node.target) }));
    })).toEqual([]);
  }
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
