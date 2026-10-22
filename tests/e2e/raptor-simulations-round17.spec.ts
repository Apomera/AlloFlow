import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off' });
test.describe.configure({ retries: 0, timeout: 180_000 });
const harness = new GlHarness({ toolId: 'raptorHunt', toolFile: 'stem_lab/stem_tool_raptorhunt.js', width: 1100, height: 1000,
  layout: 'document', appStyles: true, extraScripts: ['node_modules/axe-core/axe.min.js'] });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

type Model = { version: number; search: number; handling: number; density: number };
const initial: Model = { version: 1, search: .5, handling: .2, density: 20 };
// Independent cycle-time oracle: solve the available-time budget numerically.
// Each expected capture uses a mean search wait plus a handling interval. This
// does not reproduce the production rational expression or search fraction.
function cycle(model: Model, density: number) {
  const encounter = model.search * density;
  if (encounter === 0) return { rate: 0, search: 1, handling: 0, wait: null, duration: null };
  const wait = 1 / encounter;
  let low = 0, high = encounter;
  for (let iteration = 0; iteration < 90; iteration++) {
    const captures = (low + high) / 2;
    if (captures * wait + captures * model.handling > 1) high = captures; else low = captures;
  }
  const rate = (low + high) / 2;
  return { rate, search: rate * wait, handling: rate * model.handling, wait, duration: wait + model.handling };
}
function scaleFor(model: Model, pinned?: Model) {
  const maximum = Math.max(1, cycle(model, 100).rate, pinned ? cycle(pinned, 100).rate : 0);
  return [1, 2, 5, 10, 20, 50, 100, 200].find(value => value >= maximum)!;
}
async function mount(page: Page, encounterStudy?: any) {
  await page.setViewportSize({ width: 1280, height: 1000 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { raptorHunt: { activeSection: 'ecology', encounterStudy, xp: 0 } }, undefined, { expectCanvas: false });
  await expect(page.locator('[data-raptor-encounter-study]')).toBeVisible();
}
async function replace(page: Page, model: Model) {
  await page.evaluate(value => (window as any).__ctx.setToolData((previous: any) => ({ ...previous, raptorHunt: { ...previous.raptorHunt, encounterStudy: value } })), model);
  for (const [key, value] of Object.entries(model).filter(([key]) => key !== 'version')) await expect(page.locator('#rh-encounter-' + key)).toHaveValue(String(value));
}
async function range(page: Page, key: string, value: number) {
  await page.locator('#rh-encounter-' + key).evaluate((element: HTMLInputElement, next) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(element, String(next));
    element.dispatchEvent(new Event('input', { bubbles: true })); element.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
  await expect(page.locator('#rh-encounter-' + key)).toHaveValue(String(value));
}
async function drawing(page: Page, key = 'current'): Promise<any> {
  return page.locator('[data-raptor-encounter-study]').evaluate((root, key) => {
    const budget = root.querySelector('[data-encounter-budget="' + key + '"]')!, curve = root.querySelector<SVGPathElement>('[data-encounter-curve="' + key + '"]')!;
    const point = root.querySelector<SVGCircleElement>('[data-encounter-point="' + key + '"]')!, inspector = root.querySelector<SVGLineElement>('[data-encounter-inspector]')!;
    const ceiling = root.querySelector<SVGLineElement>('[data-encounter-ceiling="' + key + '"]');
    return { scale: Number(root.getAttribute('data-encounter-scale')),
      curve: Array.from(curve.getAttribute('d')!.matchAll(/[ML]([-\d.]+) ([-\d.]+)/g), match => [Number(match[1]), Number(match[2])]),
      curveStyle: { stroke: getComputedStyle(curve).stroke, fill: getComputedStyle(curve).fill, dash: curve.getAttribute('stroke-dasharray'), width: curve.getAttribute('stroke-width') },
      point: [point.cx.baseVal.value, point.cy.baseVal.value],
      inspector: [inspector.x1.baseVal.value, inspector.y1.baseVal.value, inspector.x2.baseVal.value, inspector.y2.baseVal.value],
      ceiling: ceiling ? [ceiling.x1.baseVal.value, ceiling.y1.baseVal.value, ceiling.x2.baseVal.value, ceiling.y2.baseVal.value] : null,
      bars: ['search', 'handling'].map(name => { const bar = budget.querySelector<SVGRectElement>('[data-encounter-time="' + key + ':' + name + '"]')!;
        return { name, x: bar.x.baseVal.value, y: bar.y.baseVal.value, width: bar.width.baseVal.value, height: bar.height.baseVal.value, fill: getComputedStyle(bar).fill,
          text: budget.querySelector('[data-encounter-fraction="' + key + ':' + name + '"]')!.textContent }; }),
      rate: budget.querySelector('[data-encounter-rate]')!.textContent, cycle: budget.querySelector('[data-encounter-cycle]')!.textContent,
      limit: budget.querySelector('[data-encounter-limit]')!.textContent, label: budget.querySelector('svg')!.getAttribute('aria-label'),
      invalid: Array.from(root.querySelectorAll('svg *')).flatMap(node => Array.from(node.attributes).filter(attribute => /NaN|Infinity/.test(attribute.value)).map(attribute => [node.tagName, attribute.name, attribute.value])) };
  }, key);
}
function inspect(native: any, model: Model, density: number, scale: number, key = 'current') {
  const point = cycle(model, density), errors: string[] = [];
  function near(actual: number, expected: number, label: string, tolerance = .0001) { if (!Number.isFinite(actual) || Math.abs(actual - expected) > tolerance) errors.push(label + ': ' + actual + ' vs ' + expected); }
  function reading(text: string, expected: number, label: string) { if (expected > 0 && expected < .001) { if (text !== '<0.001') errors.push(label + ': small nonzero display'); } else near(Number(text.replace(/,/g, '')), expected, label, .000501); }
  near(native.scale, scale, 'shared scale');
  if (native.curve.length !== 201) errors.push('201 native curve vertices');
  native.curve.forEach((vertex: number[], index: number) => { near(vertex[0], 66 + index / 200 * 526, 'curve x ' + index, .00051); near(vertex[1], 250 - cycle(model, index / 2).rate / scale * 190, 'curve y ' + index, .00051); });
  [66 + density / 100 * 526, 250 - point.rate / scale * 190].forEach((value, index) => near(native.point[index], value, 'inspected native point ' + index));
  [66 + density / 100 * 526, 49, 66 + density / 100 * 526, 250].forEach((value, index) => near(native.inspector[index], value, 'shared density inspector ' + index));
  const limit = model.handling > 0 ? 1 / model.handling : null;
  if (limit !== null && limit <= scale) {
    if (!native.ceiling) errors.push('missing in-scale handling ceiling');
    else [66, 250 - limit / scale * 190, 592, 250 - limit / scale * 190].forEach((value, index) => near(native.ceiling[index], value, 'native ceiling ' + index));
  } else if (native.ceiling) errors.push('unbounded or off-scale ceiling painted');
  const s = native.bars[0], h = native.bars[1];
  [28, 58, 584 * point.search, 43].forEach((value, index) => near([s.x, s.y, s.width, s.height][index], value, 'native search budget ' + index));
  [28 + 584 * point.search, 58, 584 * point.handling, 43].forEach((value, index) => near([h.x, h.y, h.width, h.height][index], value, 'native handling budget ' + index));
  near(s.width + h.width, 584, 'whole available-time budget');
  near(s.width / 584 * model.search * density, point.rate, 'capture rate recovered from native search allocation');
  near(h.width / 584, point.rate * model.handling, 'handling allocation recovered from rate');
  reading(s.text.replace('% search', ''), point.search * 100, 'search percent'); reading(h.text.replace('% handling', ''), point.handling * 100, 'handling percent'); reading(native.rate, point.rate, 'capture rate');
  if (!native.label.includes('prey per total-time unit')) errors.push('rate units absent');
  if (point.wait === null) { if (!native.cycle.includes('no finite mean search wait, zero captures')) errors.push('zero encounter boundary'); }
  else {
    const values = Array.from(native.cycle.matchAll(/(?:capture: |length: )([\d,]+(?:\.\d+)?|<0\.001)/g), (match: any) => match[1]);
    if (values.length !== 3) errors.push('three separately labeled cycle durations');
    else [point.wait, model.handling, point.duration!].forEach((value, index) => reading(values[index], value, 'cycle duration ' + index));
  }
  if (model.handling === 0 && !native.limit.startsWith('h = 0: no finite handling ceiling.')) errors.push('zero handling limit');
  if (model.handling > 0 && !native.limit.startsWith('Handling-only ceiling: ')) errors.push('finite handling limit');
  if (limit !== null && limit > scale && !native.limit.includes('above the displayed rate scale')) errors.push('off-scale ceiling disclosure');
  if (model.search === 0 && model.handling > 0 && !native.limit.includes('rate stays zero at every density')) errors.push('zero a is not a positive asymptote');
  if (native.curveStyle.stroke !== (key === 'current' ? 'rgb(239, 207, 150)' : 'rgb(166, 219, 206)') || native.curveStyle.fill !== 'none' || s.fill !== 'rgb(165, 215, 187)' || h.fill !== 'rgb(239, 207, 150)') errors.push('rendered native colors');
  if (native.curveStyle.dash !== (key === 'current' ? null : '8 5') || Number(native.curveStyle.width) !== (key === 'current' ? 3.5 : 3)) errors.push('native condition distinction');
  if (native.invalid.length) errors.push('nonfinite native geometry');
  return errors;
}
async function checked(page: Page, model: Model, density: number, scale: number, key = 'current') {
  let native: any;
  // Shared reduced-motion CSS still creates a short color transition on SVG.
  // Observe the exact settled native colors without an arbitrary timing sleep.
  await expect.poll(async () => { native = await drawing(page, key); return inspect(native, model, density, scale, key).filter(error => error === 'rendered native colors'); }).toEqual([]);
  return inspect(native, model, density, scale, key);
}

test('independent cycle-time root oracle matches response curves, native time budgets, units and finite zero/extreme limits', async ({ page }) => {
  await mount(page); const errors: string[] = [];
  for (const model of [initial, { ...initial, density: 0 }, { ...initial, search: 0, handling: 1, density: 100 },
    { ...initial, search: 2, handling: 0, density: 100 }, { ...initial, search: 2, handling: 1, density: 100 },
    { ...initial, search: .05, handling: .05, density: 1 }, { ...initial, search: .35, handling: .65, density: 37 }]) {
    await replace(page, model); errors.push(...(await checked(page, model, model.density, scaleFor(model))).map(error => JSON.stringify(model) + ': ' + error));
  }
  expect(errors).toEqual([]);
  await replace(page, initial); const completeCurve = await page.locator('[data-encounter-curve="current"]').getAttribute('d'), scale = scaleFor(initial);
  for (const density of [0, 1, 20, 50, 100]) { await range(page, 'density', density); expect(await checked(page, initial, density, scale)).toEqual([]); expect(await page.locator('[data-encounter-curve="current"]').getAttribute('d')).toBe(completeCurve); }
  await page.getByText('Read the exact assumptions, units, and research context', { exact: true }).click();
  const root = page.locator('[data-raptor-encounter-study]');
  for (const boundary of ['Searching and handling are mutually exclusive', 'constant, undepleted density', 'a has units area per search-time', 'no finite handling ceiling', 'does not model depletion', 'authored, not measured raptor values']) await expect(root).toContainText(boundary);
  await expect(root.locator('a[href="https://doi.org/10.4039/Ent91385-7"]')).toBeVisible();
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('frozen coefficients, exact experiments, shared density/scales and persisted bounds stay isolated without progress awards', async ({ page }) => {
  await mount(page); await page.locator('[data-encounter-pin]').click();
  const pin = initial, settings = await page.locator('[data-encounter-pinned-settings]').textContent(), pinnedCurve = await page.locator('[data-encounter-curve="pinned"]').getAttribute('d');
  await page.locator('[data-encounter-experiment="double-search"]').click();
  const faster = { ...initial, search: 1 };
  expect(await checked(page, faster, 20, scaleFor(faster, pin))).toEqual([]); expect(await checked(page, pin, 20, scaleFor(faster, pin), 'pinned')).toEqual([]);
  expect(await page.locator('[data-encounter-curve="pinned"]').getAttribute('d')).toBe(pinnedCurve);
  await expect(page.locator('[data-encounter-comparison]')).toContainText('Current / pinned rate: 1.200×');
  await range(page, 'search', 2); await range(page, 'handling', 1); await range(page, 'density', 65);
  await page.locator('[data-encounter-experiment="double-handling"]').click();
  const slower = { ...initial, handling: .4, density: 65 };
  expect(await page.evaluate(() => (window as any).__toolData.raptorHunt.encounterStudy)).toEqual(slower);
  expect(await checked(page, slower, 65, scaleFor(slower, pin))).toEqual([]); expect(await page.locator('[data-encounter-pinned-settings]').textContent()).toBe(settings);
  const scale = await page.locator('[data-raptor-encounter-study]').getAttribute('data-encounter-scale');
  for (const density of [0, 20, 100]) {
    await range(page, 'density', density); expect(await page.locator('[data-raptor-encounter-study]').getAttribute('data-encounter-scale')).toBe(scale);
    expect(await checked(page, slower, density, scaleFor(slower, pin))).toEqual([]); expect(await checked(page, pin, density, scaleFor(slower, pin), 'pinned')).toEqual([]);
    if (!density) await expect(page.locator('[data-encounter-comparison]')).toContainText('Rate ratio is undefined because the pinned rate is zero');
  }
  await page.locator('[data-encounter-experiment="no-handling"]').click(); const linear = { ...initial, handling: 0, density: 100 };
  expect(await page.evaluate(() => (window as any).__toolData.raptorHunt.encounterStudy)).toEqual(linear);
  expect(await checked(page, linear, 100, scaleFor(linear, pin))).toEqual([]); expect(await checked(page, pin, 100, scaleFor(linear, pin), 'pinned')).toEqual([]);
  await page.evaluate(() => (window as any).__ctx.setToolData((previous: any) => ({ ...previous, raptorHunt: { ...previous.raptorHunt, statusSort: 'name' } })));
  expect(await page.locator('[data-encounter-pinned-settings]').textContent()).toBe(settings);
  await range(page, 'search', 1.05); await range(page, 'handling', .55); await page.locator('[data-encounter-pin]').click();
  for (const action of ['double-search', 'double-handling']) await expect(page.locator('[data-encounter-experiment="' + action + '"]')).toBeDisabled();
  const before = await page.evaluate(() => JSON.stringify((window as any).__toolData.raptorHunt.encounterStudy));
  await page.locator('[data-encounter-experiment="double-search"]').evaluate((button: HTMLButtonElement) => button.click()); expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.raptorHunt.encounterStudy))).toBe(before);
  await range(page, 'search', 0); await range(page, 'handling', 0); await page.locator('[data-encounter-pin]').click();
  for (const action of ['double-search', 'double-handling', 'no-handling']) await expect(page.locator('[data-encounter-experiment="' + action + '"]')).toBeDisabled();
  await page.locator('[data-encounter-answer="double"]').click(); await expect(page.locator('.rh-encounter-feedback')).toContainText('zero-rate ratios are undefined');
  await page.locator('[data-encounter-answer="budget"]').click(); await expect(page.locator('.rh-encounter-feedback')).toContainText('When h = 0 the response is linear');
  await page.locator('[data-encounter-reset]').click(); await expect(page.locator('#rh-encounter-density')).toHaveValue('100'); await expect(page.locator('#rh-encounter-search')).toHaveValue('0.5'); await expect(page.locator('.rh-encounter-feedback')).toHaveCount(0);
  await page.locator('[data-encounter-clear-pin]').click(); await expect(page.locator('[data-encounter-budget="pinned"]')).toHaveCount(0); await page.locator('[data-encounter-pin]').click();
  await page.evaluate(() => (window as any).__ctx.setToolData((previous: any) => ({ ...previous, raptorHunt: { ...previous.raptorHunt, activeSection: 'hub' } })));
  await expect(page.locator('[data-raptor-encounter-study]')).toHaveCount(0);
  await page.evaluate(() => (window as any).__ctx.setToolData((previous: any) => ({ ...previous, raptorHunt: { ...previous.raptorHunt, activeSection: 'ecology' } })));
  await expect(page.locator('#rh-encounter-density')).toHaveValue('100'); await expect(page.locator('[data-encounter-budget="pinned"]')).toHaveCount(0);
  await page.evaluate(() => (window as any).__ctx.setToolData((previous: any) => ({ ...previous, raptorHunt: { ...previous.raptorHunt, encounterStudy: { version: 1, search: '2', handling: Infinity, density: 999 } } })));
  for (const [key, value] of Object.entries({ search: .5, handling: .2, density: 100 })) await expect(page.locator('#rh-encounter-' + key)).toHaveValue(String(value));
  await range(page, 'search', 1); expect(await page.evaluate(() => (window as any).__toolData.raptorHunt.encounterStudy)).toEqual({ version: 1, search: 1, handling: .2, density: 100 });
  await page.evaluate(() => (window as any).__ctx.setToolData((previous: any) => ({ ...previous, raptorHunt: { ...previous.raptorHunt, encounterStudy: { version: 1, search: -9, handling: 9, density: -999 } } })));
  for (const [key, value] of Object.entries({ search: 0, handling: 1, density: 0 })) await expect(page.locator('#rh-encounter-' + key)).toHaveValue(String(value));
  await page.evaluate(() => (window as any).__ctx.setToolData((previous: any) => ({ ...previous, raptorHunt: { ...previous.raptorHunt, encounterStudy: { version: 1, search: .123, handling: .876, density: 19.6 } } })));
  for (const [key, value] of Object.entries({ search: .1, handling: .9, density: 20 })) await expect(page.locator('#rh-encounter-' + key)).toHaveValue(String(value));
  await page.evaluate(() => (window as any).__ctx.setToolData((previous: any) => ({ ...previous, raptorHunt: { ...previous.raptorHunt, encounterStudy: { version: 99, search: 2, handling: 1, density: 100 } } })));
  for (const [key, value] of Object.entries(initial).filter(([key]) => key !== 'version')) await expect(page.locator('#rh-encounter-' + key)).toHaveValue(String(value));
  await page.getByText('Explore the original ecology and food-web reference', { exact: true }).click(); await expect(page.getByRole('group', { name: 'Ecology topics', exact: true })).toBeVisible();
  expect(await page.evaluate(() => (window as any).__toolData.raptorHunt.xp)).toBe(0); expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('manual encounter controls and current/frozen diagrams remain keyboard accessible and readable at desktop, phone and embedded widths', async ({ page }) => {
  await mount(page); const root = page.locator('[data-raptor-encounter-study]'), before = await root.innerHTML();
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))); expect(await root.innerHTML()).toBe(before);
  await page.locator('[data-encounter-pin]').focus(); await page.keyboard.press('Enter'); await expect(page.locator('[data-encounter-budget="pinned"]')).toBeVisible();
  for (const layout of [{ viewport: 1280, host: 1100 }, { viewport: 390, host: 390 }, { viewport: 1280, host: 500 }]) {
    await page.setViewportSize({ width: layout.viewport, height: 1000 });
    await page.locator('#wrap').evaluate((element: HTMLElement, width) => { element.style.width = width + 'px'; element.style.maxWidth = '100%'; }, layout.host);
    await page.locator('#rh-encounter-search').focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight'); await expect(page.locator('#rh-encounter-search')).toHaveValue('0.05'); await expect(page.locator('#rh-encounter-search')).toBeFocused();
    await page.locator('#rh-encounter-handling').focus(); await page.keyboard.press('End'); await page.keyboard.press('ArrowLeft'); await expect(page.locator('#rh-encounter-handling')).toHaveValue('0.95');
    await page.locator('#rh-encounter-density').focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight'); await expect(page.locator('#rh-encounter-density')).toHaveValue('1'); await expect(page.locator('#rh-encounter-density')).toBeFocused();
    await page.locator('[data-encounter-experiment="double-search"]').focus(); await page.keyboard.press('Space'); await expect(page.locator('#rh-encounter-search')).toHaveValue('1'); await expect(page.locator('#rh-encounter-handling')).toHaveValue('0.2'); await expect(page.locator('[data-encounter-experiment="double-search"]')).toBeFocused();
    const host = (await page.locator('#wrap').boundingBox())!;
    for (const selector of ['[data-raptor-encounter-study]', '[data-encounter-plot]', '[data-encounter-budget="current"]', '[data-encounter-budget="pinned"]', '.rh-encounter-controls', '.rh-encounter-compare', '.rh-encounter-evidence']) {
      const element = page.locator(selector), box = (await element.boundingBox())!;
      expect(box.x, selector).toBeGreaterThanOrEqual(host.x - 1); expect(box.x + box.width, selector).toBeLessThanOrEqual(host.x + host.width + 1);
      expect(await element.evaluate(node => node.scrollWidth - node.clientWidth), selector).toBeLessThanOrEqual(1);
    }
    for (const selector of ['[data-encounter-plot] svg', '[data-encounter-budget="current"] svg', '[data-encounter-budget="pinned"] svg']) expect((await page.locator(selector).boundingBox())!.width, selector).toBeGreaterThan(280);
    const textFailures = await root.locator('svg').evaluateAll(elements => elements.flatMap(svg => Array.from(svg.querySelectorAll('text')).filter(text => { const box = text.getBBox(), view = svg.viewBox.baseVal; return box.x < -1 || box.y < -1 || box.x + box.width > view.width + 1 || box.y + box.height > view.height + 1; }).map(text => text.textContent)));
    expect(textFailures).toEqual([]);
    expect(await page.evaluate(async () => {
      const report = await (window as any).axe.run(document.querySelector('[data-raptor-encounter-study]'), { runOnly: { type: 'rule', values: ['color-contrast', 'button-name', 'select-name', 'label', 'aria-valid-attr-value', 'aria-required-children', 'aria-required-parent', 'nested-interactive'] } });
      return report.violations.map((item: any) => ({ id: item.id, targets: item.nodes.map((node: any) => node.target) }));
    })).toEqual([]);
  }
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
