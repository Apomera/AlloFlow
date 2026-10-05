import { test, expect, type Locator, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

test.use({ video: 'off' });
test.describe.configure({ retries: 0, timeout: 150000 });
const out = path.resolve(process.env.MICROBIOLOGY_REPORT_DIR || 'reports/micro-lab-sweep-visuals-2026-10-04');
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_microbiology.js', toolId: 'microbiology', width: 1280, height: 960, layout: 'document' });
const layoutStyle = '#wrap{width:100%!important}body{margin:0;font-family:system-ui,sans-serif}button,input,select,textarea{font-family:inherit}';
type Variable = 'tempC' | 'pH' | 'oxygen';
type Conditions = { profile: string; tempC: number; pH: number; oxygen: number };
type Descriptor = { variable: Variable; conditions: Conditions };
type Sample = { value: number; population: number; score: number; lag: number; conditions: Conditions };
type Sweep = Descriptor & { samples: Sample[] };
const base: Conditions = { profile: 'ecoli', tempC: 37, pH: 7, oxygen: 100 };
const prior: Conditions = { profile: 'thermus', tempC: 65, pH: 7.5, oxygen: 100 };
// Established teaching samples, read independently of the sweep renderer and its projection helpers.
const settings: Record<Variable, number[]> = {
  tempC: [0, 10, 20, 30, 37, 45, 60, 70, 80, 90],
  pH: [3, 4, 5, 5.5, 6, 7, 7.5, 8, 9, 10],
  oxygen: [0, 5, 10, 20, 35, 50, 65, 80, 100],
};
const extent: Record<Variable, [number, number]> = { tempC: [0, 90], pH: [3, 10], oxygen: [0, 100] };
const ticks: Record<Variable, number[]> = { tempC: [0, 30, 60, 90], pH: [3, 5, 7, 10], oxygen: [0, 25, 50, 75, 100] };
const literal = '<img src=x onerror="window.__sweepVisualInjected=true"> Keep imported sweep evidence literal.';
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const state = (page: Page) => page.evaluate(() => (window as any).__toolData);
const prefix = (previous = false) => previous ? 'gl-previous-sweep' : 'gl-current-sweep';
const figure = (page: Page, previous = false) => page.locator('#' + prefix(previous) + '-figure');
const chart = (page: Page, previous = false) => page.locator('#' + prefix(previous) + '-chart');
const evidence = (page: Page, previous = false) => page.locator('#' + prefix(previous) + '-evidence');
const selector = (page: Page, previous = false) => page.locator('#' + prefix(previous) + '-setting');
const curve = (page: Page, previous = false) => chart(page, previous).locator('[data-sweep-curve]').getAttribute('d');
const counters = (page: Page) => page.evaluate(() => ({ xp: (window as any).__sweepVisualXP, random: (window as any).__sweepVisualRandom }));
let errors: string[];

function seed(variable: Variable = 'tempC', conditions: Conditions = base): Record<string, any> {
  return {
    tab: 'growthLab', showMicroLibrary: false, growthReviewHour: 6, earnedXP: 71,
    growthLab: { ...prior, oxygen: 35, hypothesis: 'Independent legacy reasoning.', explanation: literal,
      log: [{ profile: 'thermus', t: 65, p: 7.5, o: 35, state: 'Earlier recorded label.' }], importedMetadata: { literal, keep: true } },
    growthInvestigation: {
      trials: [{ id: 7, control: { ...base, importedControl: { literal } }, conditions: { ...base, tempC: 35, importedConditions: true },
        prediction: 'similar', hypothesis: literal, explanation: '=SUM(1,2)\nKeep the original explanation.', citedHours: [0, 6, 24], importedTrial: { literal } }],
      selectedId: 7, nextId: 60, control: { ...prior, importedNextControl: true }, prediction: 'unsure',
      hypothesis: 'Next-run reasoning remains independent.', notebookMetadata: { literal, keep: [1, 2] }, sweepVariable: 'oxygen',
      sweep: { variable, conditions: { ...conditions, importedConditions: { literal } }, points: [{ value: 37, finalPopulation: 987654321 }], maximum: 987654321, importedSweep: { literal } },
      previousSweep: { variable: 'pH', conditions: { ...prior, importedPreviousConditions: true }, points: [{ value: 7.5, finalPopulation: -999 }], importedPrevious: { literal } },
      removed: { trial: { id: 19, control: base, conditions: { ...base, pH: 6 }, prediction: 'lower', hypothesis: 'Recoverable reasoning.', explanation: literal, importedRecovery: true }, index: 1 },
    },
    resistanceInvestigation: { dose: 0, duration: 8, initRes: 10, history: [{ day: 0, sensitive: 72, resistant: 8 }], importedResistance: { literal } },
    importedMetadata: { literal, keep: true },
  };
}
async function instrument(page: Page) {
  await page.evaluate(() => {
    const w = window as any; w.__sweepVisualXP = []; w.__sweepVisualRandom = 0;
    w.__ctx.awardXP = (...args: any[]) => w.__sweepVisualXP.push(args);
    if (!w.__sweepVisualOriginalRandom) {
      w.__sweepVisualOriginalRandom = Math.random;
      Math.random = () => { w.__sweepVisualRandom++; return w.__sweepVisualOriginalRandom(); };
    }
    w.__rerender();
  });
}
async function open(details: Locator) {
  if (!await details.evaluate(node => (node as HTMLDetailsElement).open)) {
    const summary = details.locator(':scope > summary'); await summary.focus(); await summary.press('Enter');
  }
  await expect(details).toHaveAttribute('open', '');
}
async function mount(page: Page, data = seed()) {
  await page.setViewportSize({ width: 1280, height: 960 });
  await harness.mount(page, { unrelatedNotebook: { literal, keep: [1, 2, 3] }, microbiology: data }, undefined, { expectCanvas: false });
  await page.addStyleTag({ content: layoutStyle }); await instrument(page);
  await expect(page.locator('[data-microbiology-tool]')).toBeVisible();
  await open(page.locator('.micro-growth-sweep'));
}
async function oracle(page: Page, descriptor: Descriptor): Promise<Sweep> {
  // Evaluate the established culture simulator once per independent sampled setting.
  return page.evaluate(({ descriptor, values }) => {
    const model = (window as any).__MicrobiologyCore.growth;
    return { ...descriptor, samples: values.map(value => {
      const result = model.simulate({ ...descriptor.conditions, [descriptor.variable]: value });
      return { value, population: result.finalPopulation, score: result.score, lag: result.lagHours, conditions: result.conditions };
    }) };
  }, { descriptor, values: settings[descriptor.variable] });
}
function settingText(variable: Variable, value: number) { return value + (variable === 'tempC' ? ' °C' : variable === 'oxygen' ? '/100' : ''); }
function x(variable: Variable, value: number) { const [min, max] = extent[variable]; return (value - min) / (max - min) * 100; }
async function inspect(page: Page, value: number, previous = false) {
  const before = clone(await state(page));
  await selector(page, previous).selectOption(String(value));
  await expect(selector(page, previous)).toHaveValue(String(value));
  expect(await state(page)).toEqual(before);
  expect(await counters(page)).toEqual({ xp: [], random: 0 });
}
async function assertSweep(page: Page, expected: Sweep, selected: number, previous = false) {
  const id = prefix(previous), selectedPoint = expected.samples.find(sample => sample.value === selected)!;
  await expect(figure(page, previous)).toBeVisible(); await expect(figure(page, previous)).toHaveJSProperty('tagName', 'FIGURE');
  await expect(chart(page, previous)).toHaveAttribute('viewBox', '0 0 100 100');
  await expect(chart(page, previous)).toHaveAttribute('preserveAspectRatio', 'none');
  await expect(chart(page, previous)).toHaveAttribute('role', 'img');
  expect(await chart(page, previous).getAttribute('aria-label')).toBeTruthy();
  await expect(chart(page, previous).locator('text')).toHaveCount(0);
  await expect(selector(page, previous)).toHaveAccessibleName('Inspect sampled setting · ' + (previous ? 'Previous sweep' : 'Current sweep'));
  await expect(selector(page, previous)).toHaveValue(String(selected));
  expect(await selector(page, previous).locator('option').evaluateAll(nodes => nodes.map(node => Number((node as HTMLOptionElement).value)))).toEqual(settings[expected.variable]);
  const geometry = await chart(page, previous).evaluate(svg => ({
    grids: [...svg.querySelectorAll('[data-sweep-level]')].map(line => ({ level: Number(line.getAttribute('data-sweep-level')), x1: Number(line.getAttribute('x1')),
      x2: Number(line.getAttribute('x2')), y1: Number(line.getAttribute('y1')), y2: Number(line.getAttribute('y2')) })),
    curves: [...svg.querySelectorAll('[data-sweep-curve]')].map(node => node.getAttribute('d') || ''),
    guides: [...svg.querySelectorAll('[data-sweep-guide]')].map(line => ({ value: Number(line.getAttribute('data-sweep-guide')), x1: Number(line.getAttribute('x1')),
      x2: Number(line.getAttribute('x2')), y1: Number(line.getAttribute('y1')), y2: Number(line.getAttribute('y2')) })),
  }));
  expect(geometry.grids.map(grid => grid.level).sort((a, b) => a - b)).toEqual([0, 25, 50, 75, 100]);
  for (const grid of geometry.grids) expect(grid).toEqual({ level: grid.level, x1: 0, x2: 100, y1: 100 - grid.level, y2: 100 - grid.level });
  expect(geometry.curves).toHaveLength(1);
  const coordinates = [...geometry.curves[0].matchAll(/[ML]\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/g)].map(match => [Number(match[1]), Number(match[2])]);
  expect(coordinates).toHaveLength(expected.samples.length);
  expected.samples.forEach((sample, index) => {
    expect(coordinates[index][0]).toBeCloseTo(x(expected.variable, sample.value), 3);
    expect(coordinates[index][1]).toBeCloseTo(100 - sample.population, 3);
  });
  expect(geometry.guides).toHaveLength(1);
  expect(geometry.guides[0].value).toBe(selected); expect(geometry.guides[0].x1).toBeCloseTo(x(expected.variable, selected), 8);
  expect(geometry.guides[0].x2).toBeCloseTo(x(expected.variable, selected), 8);
  expect(geometry.guides[0].y1).toBe(0); expect(geometry.guides[0].y2).toBe(100);
  const rendered = await page.locator('#' + id + '-plot').evaluate(plot => {
    const bounds = plot.getBoundingClientRect();
    const markers = [...plot.querySelectorAll('[data-sweep-point], [data-sweep-selected]')].map(node => {
      const rect = node.getBoundingClientRect(), style = getComputedStyle(node);
      return { value: Number(node.getAttribute('data-sweep-point') ?? node.getAttribute('data-sweep-selected')), population: Number(node.getAttribute('data-population')),
        response: node.getAttribute('data-response'), selected: node.hasAttribute('data-sweep-selected'), width: parseFloat(style.width), height: parseFloat(style.height),
        radius: style.borderTopLeftRadius, borderWidth: parseFloat(style.borderTopWidth), centerX: rect.x + rect.width / 2, centerY: rect.y + rect.height / 2 };
    });
    return { bounds: { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height }, markers };
  });
  expect(rendered.markers.filter(marker => !marker.selected).map(marker => marker.value)).toEqual(settings[expected.variable]);
  expect(rendered.markers.filter(marker => marker.selected)).toHaveLength(1);
  for (const marker of rendered.markers) {
    const sample = expected.samples.find(sample => sample.value === marker.value)!;
    expect(marker.population).toBeCloseTo(sample.population, 8);
    if (!marker.selected) expect(marker.response).toBe(sample.score === 0 ? 'flat' : 'increase');
    expect(marker.width).toBe(marker.selected ? 18 : 8); expect(marker.height).toBe(marker.width);
    expect(marker.radius).toBe(sample.score === 0 ? '0px' : '50%');
    if (marker.selected) { expect(marker.value).toBe(selected); expect(marker.borderWidth).toBeGreaterThanOrEqual(2); }
    expect(Math.abs(marker.centerX - (rendered.bounds.x + x(expected.variable, marker.value) / 100 * rendered.bounds.width))).toBeLessThan(1);
    expect(Math.abs(marker.centerY - (rendered.bounds.y + (100 - sample.population) / 100 * rendered.bounds.height))).toBeLessThan(1);
  }
  const axes = await page.locator('#' + id + '-axes').evaluate(node => {
    const zoom = parseFloat(getComputedStyle(document.body).zoom) || 1;
    return [...node.querySelectorAll('[data-sweep-y-label], [data-sweep-x-label]')].map(label => {
      const rect = label.getBoundingClientRect(), style = getComputedStyle(label);
      return { y: label.hasAttribute('data-sweep-y-label'), value: Number(label.getAttribute('data-sweep-y-label') ?? label.getAttribute('data-sweep-x-label')),
        left: rect.left, right: rect.right, centerX: rect.x + rect.width / 2, centerY: rect.y + rect.height / 2, height: rect.height / zoom,
        lineHeight: parseFloat(style.lineHeight), fontSize: parseFloat(style.fontSize) };
    });
  });
  expect(axes.filter(label => label.y).map(label => label.value)).toEqual([100, 75, 50, 25, 0]);
  expect(axes.filter(label => !label.y).map(label => label.value)).toEqual(ticks[expected.variable]);
  for (const label of axes) {
    expect(label.fontSize).toBeGreaterThanOrEqual(14); expect(label.height).toBeLessThanOrEqual(label.lineHeight + 1);
    if (label.y) expect(Math.abs(label.centerY - (rendered.bounds.y + (100 - label.value) / 100 * rendered.bounds.height))).toBeLessThan(1);
    else {
      // Endpoint labels face inward so their text stays inside the plot at narrow widths.
      const [minimum, maximum] = extent[expected.variable];
      const anchor = label.value === minimum ? label.left : label.value === maximum ? label.right : label.centerX;
      expect(Math.abs(anchor - (rendered.bounds.x + x(expected.variable, label.value) / 100 * rendered.bounds.width))).toBeLessThan(1);
    }
  }
  const values = page.locator('#' + id + '-values'); await expect(values).toHaveJSProperty('tagName', 'DL');
  await expect(values.locator('dt')).toHaveCount(3);
  await expect(values.locator('[data-sweep-readout="setting"]')).toHaveText(settingText(expected.variable, selected));
  const population = values.locator('[data-sweep-readout="population"]');
  await expect(population).toHaveText(selectedPoint.population.toFixed(1));
  expect(Number(await population.getAttribute('data-value'))).toBeCloseTo(selectedPoint.population, 8);
  await expect(values.locator('[data-sweep-readout="response"]')).toHaveText(selectedPoint.score === 0 ? 'No modeled increase' : 'Population increases');
  const status = page.locator('#' + id + '-selected');
  await expect(status).toHaveAttribute('aria-live', 'polite'); await expect(status).toHaveAttribute('aria-atomic', 'true');
  await expect(status).toContainText(settingText(expected.variable, selected));
  const table = evidence(page, previous).locator('.micro-growth-sweep-table');
  expect(await table.locator('tbody tr').evaluateAll(rows => rows.map(row => Number(row.getAttribute('data-sweep-setting'))))).toEqual(settings[expected.variable]);
  await expect(table.locator('tbody tr[aria-current="true"]')).toHaveCount(1);
  await expect(table.locator('tbody tr[aria-current="true"]')).toHaveAttribute('data-sweep-setting', String(selected));
  for (const sample of expected.samples) {
    const row = table.locator('tbody tr[data-sweep-setting="' + sample.value + '"]');
    await expect(row.locator('th')).toHaveText(settingText(expected.variable, sample.value));
    await expect(row.locator('td').nth(0)).toHaveText(sample.population.toFixed(1));
    await expect(row.locator('td').nth(1)).toHaveText(sample.score === 0 ? 'No modeled increase' : 'Population increases');
  }
}
async function assertLayout(page: Page, previous = false) {
  const viewport = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
  expect(viewport.scroll <= viewport.width + 1, JSON.stringify(viewport)).toBe(true);
  for (const node of [figure(page, previous), page.locator('#' + prefix(previous) + '-axes'), page.locator('#' + prefix(previous) + '-values')]) {
    const bounds = await node.evaluate(element => ({ id: element.id, client: element.clientWidth, scroll: element.scrollWidth }));
    expect(bounds.scroll <= bounds.client + 1, JSON.stringify(bounds)).toBe(true);
  }
  const control = selector(page, previous); await control.focus(); await expect(control).toBeFocused();
  const style = await control.evaluate(element => {
    const style = getComputedStyle(element), rect = element.getBoundingClientRect();
    return { outline: style.outlineStyle, outlineWidth: parseFloat(style.outlineWidth), height: parseFloat(style.height),
      fontSize: parseFloat(style.fontSize), x: rect.x, right: rect.right };
  });
  expect(style.outline).not.toBe('none'); expect(style.outlineWidth).toBeGreaterThan(0);
  expect(style.height).toBeGreaterThanOrEqual(42); expect(style.fontSize).toBeGreaterThanOrEqual(14);
  expect(style.x).toBeGreaterThanOrEqual(0); expect(style.right).toBeLessThanOrEqual(viewport.width + 1);
}
async function assertForcedColourContrast(page: Page) {
  const paints = await figure(page).evaluate(figure => {
    const probe = document.createElement('span');
    probe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;forced-color-adjust:none;background:Canvas;color:CanvasText';
    document.body.appendChild(probe);
    try {
      const rgba = (colour: string) => { const values = colour.match(/[\d.]+/g)!.map(Number); return [values[0], values[1], values[2], values[3] ?? 1]; };
      const luminance = (rgb: number[]) => {
        const channels = rgb.slice(0, 3).map(value => { const c = value / 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); });
        return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
      };
      const canvas = rgba(getComputedStyle(probe).backgroundColor), canvasLuminance = luminance(canvas);
      const paintContrast = (paint: string, opacity: number) => {
        probe.style.color = paint; const rgb = rgba(getComputedStyle(probe).color), alpha = rgb[3] * opacity;
        const composite = rgb.slice(0, 3).map((value, i) => value * alpha + canvas[i] * (1 - alpha)), actual = luminance(composite);
        return (Math.max(actual, canvasLuminance) + .05) / (Math.min(actual, canvasLuminance) + .05);
      };
      return [...figure.querySelectorAll('[data-sweep-curve], [data-sweep-guide], [data-sweep-point], [data-sweep-selected]')].map(node => {
        const style = getComputedStyle(node), svg = node instanceof SVGElement;
        const selected = node.hasAttribute('data-sweep-selected');
        const paint = svg ? style.stroke : selected ? style.borderTopColor : style.backgroundColor;
        let opacity = svg ? Number(style.strokeOpacity) : 1;
        for (let element: Element | null = node; element; element = element.parentElement) opacity *= Number(getComputedStyle(element).opacity);
        return { tag: node.tagName, selected, paint, contrast: paintContrast(paint, opacity), opacity };
      });
    } finally { probe.remove(); }
  });
  expect(paints).toHaveLength(settings.tempC.length + 3);
  for (const paint of paints) expect(paint.contrast, JSON.stringify(paint)).toBeGreaterThanOrEqual(3);
}
async function setRange(control: Locator, value: number) {
  await control.evaluate((node, next) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(node, String(next));
    node.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
  await expect(control).toHaveValue(String(value));
}
async function downloadNotebook(page: Page, filename: string) {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download notebook', exact: true }).press('Enter');
  const download = await pending; expect(download.suggestedFilename()).toBe('micro-lab-notebook.txt');
  const file = path.join(out, filename); await download.saveAs(file); return readFileSync(file, 'utf8');
}

test.beforeAll(async () => { mkdirSync(out, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.beforeEach(async ({ page }) => { errors = []; page.on('pageerror', error => errors.push(error.message)); });
test.afterEach(async ({ page }) => { try { expect(errors).toEqual([]); } finally { await harness.unmount(page); } });

test('temperature, pH and oxygen sweeps use independent simulated samples on true numeric axes without accepting forged imported populations', async ({ page }) => {
  for (const [variable, conditions, initial, screenshot] of [
    ['tempC', base, 37, 'sweep-desktop.png'], ['pH', base, 7, 'sweep-ph.png'], ['oxygen', prior, 100, 'sweep-oxygen.png'],
  ] as const) {
    const data = seed(variable, conditions); await mount(page, data); const before = clone(await state(page));
    const expected = await oracle(page, { variable, conditions }); await assertSweep(page, expected, initial);
    // The sample gaps differ: equal-width ordinal projection would fail the model-axis geometry checks above.
    const gaps = expected.samples.slice(1).map((sample, index) => sample.value - expected.samples[index].value);
    expect(new Set(gaps).size).toBeGreaterThan(1);
    await expect(evidence(page)).not.toContainText('987654321');
    await expect(page.locator('[data-microbiology-tool] img[src="x"]')).toHaveCount(0);
    expect(await page.evaluate(() => Boolean((window as any).__sweepVisualInjected))).toBe(false);
    expect(await state(page)).toEqual(before); expect(await counters(page)).toEqual({ xp: [], random: 0 });
    await figure(page).screenshot({ path: path.join(out, screenshot) });
    await harness.unmount(page);
  }
});

test('current and previous sample inspection remain independent and saved response curves stay fixed while next-run drafts change', async ({ page }) => {
  await mount(page); await open(page.locator('#gl-previous-sweep'));
  const current = await oracle(page, { variable: 'tempC', conditions: base }), previous = await oracle(page, { variable: 'pH', conditions: prior });
  const originalState = clone(await state(page)), originalCurves = [await curve(page), await curve(page, true)];
  await assertSweep(page, current, 37); await assertSweep(page, previous, 7.5, true);
  await inspect(page, 30); await assertSweep(page, current, 30); await assertSweep(page, previous, 7.5, true);
  await inspect(page, 5.5, true); await assertSweep(page, current, 30); await assertSweep(page, previous, 5.5, true);
  expect(await state(page)).toEqual(originalState);
  await figure(page, true).screenshot({ path: path.join(out, 'sweep-previous.png') });
  await setRange(page.locator('#gl-tempC'), 55);
  await page.locator('#gl-sweep-variable').selectOption('pH');
  await expect(page.locator('#gl-sweep-variable')).toHaveValue('pH');
  expect([await curve(page), await curve(page, true)]).toEqual(originalCurves);
  await assertSweep(page, current, 30); await assertSweep(page, previous, 5.5, true);
  const editedDraft = clone(await state(page));
  await inspect(page, 90); await inspect(page, 10, true);
  await assertSweep(page, current, 90); await assertSweep(page, previous, 10, true);
  expect(await state(page)).toEqual(editedDraft);
  expect(editedDraft.microbiology.growthLab.tempC).toBe(55);
  expect(editedDraft.microbiology.growthInvestigation.sweep.conditions).toMatchObject(base);
  expect(editedDraft.microbiology.growthInvestigation.previousSweep.conditions).toMatchObject(prior);
});

test('zero-response sweeps keep square markers and equal-sample guidance while an unsampled saved setting starts at the first best sample', async ({ page }) => {
  const flatConditions = { ...base, tempC: 0, oxygen: 35 }, flat = seed('oxygen', flatConditions);
  delete flat.growthInvestigation.previousSweep;
  await mount(page, flat); const before = clone(await state(page)), expected = await oracle(page, { variable: 'oxygen', conditions: flatConditions });
  expect(expected.samples.every(sample => sample.score === 0 && sample.population === 5)).toBe(true);
  await assertSweep(page, expected, 35);
  await expect(evidence(page)).toContainText('Every sampled setting gives the same final population.');
  await expect(evidence(page)).not.toContainText('Highest sampled population');
  await expect(evidence(page)).toContainText('It does not establish whether cells survive outside their growth range.');
  await inspect(page, 0); await assertSweep(page, expected, 0);
  await figure(page).screenshot({ path: path.join(out, 'sweep-flat-square.png') });
  await inspect(page, 100); await assertSweep(page, expected, 100);
  expect(await state(page)).toEqual(before); await expect(figure(page, true)).toHaveCount(0);
  await harness.unmount(page);
  const unsampled = seed('tempC', { ...base, tempC: 36 });
  await mount(page, unsampled); const unsampledBefore = clone(await state(page));
  const samples = await oracle(page, { variable: 'tempC', conditions: { ...base, tempC: 36 } });
  const maximum = Math.max(...samples.samples.map(sample => sample.population)), best = samples.samples.find(sample => Math.abs(sample.population - maximum) < 1e-9)!;
  expect(best.value).toBe(37); await assertSweep(page, samples, best.value);
  expect(await state(page)).toEqual(unsampledBefore); expect(await counters(page)).toEqual({ xp: [], random: 0 });
});

test('phone, four-hundred-percent zoom, reduced-motion and forced-colour layouts retain readable axes, distinct response shapes and focused keyboard inspection', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await mount(page);
  const before = clone(await state(page)), expected = await oracle(page, { variable: 'tempC', conditions: base });
  expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
  await page.setViewportSize({ width: 320, height: 844 }); await assertLayout(page); await assertSweep(page, expected, 37);
  await figure(page).screenshot({ path: path.join(out, 'sweep-phone-320.png') });
  await page.setViewportSize({ width: 1280, height: 960 }); await page.evaluate(() => { document.body.style.zoom = '4'; });
  await assertLayout(page); await assertSweep(page, expected, 37);
  await figure(page).screenshot({ path: path.join(out, 'sweep-400-percent.png') });
  await page.evaluate(() => { document.body.style.zoom = '1'; document.body.classList.add('theme-contrast'); });
  await assertLayout(page); await assertSweep(page, expected, 37);
  for (const colorScheme of ['dark', 'light'] as const) {
    await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: 'active', colorScheme });
    expect(await page.evaluate(() => matchMedia('(forced-colors: active)').matches)).toBe(true);
    expect(await page.evaluate(scheme => matchMedia('(prefers-color-scheme: ' + scheme + ')').matches, colorScheme)).toBe(true);
    await assertLayout(page); await assertSweep(page, expected, 37); await assertForcedColourContrast(page);
    await selector(page).press('End'); await expect(selector(page)).toHaveValue('90'); await expect(selector(page)).toBeFocused();
    await assertSweep(page, expected, 90); await selector(page).press('Home'); await expect(selector(page)).toHaveValue('0'); await expect(selector(page)).toBeFocused();
    await assertSweep(page, expected, 0); await inspect(page, 37);
  }
  await figure(page).screenshot({ path: path.join(out, 'sweep-contrast.png') });
  expect(await state(page)).toEqual(before); expect(await counters(page)).toEqual({ xp: [], random: 0 });
  await page.evaluate(() => { document.body.style.zoom = '1'; document.body.classList.remove('theme-contrast'); });
  await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: 'none' });
  await harness.unmount(page);
  for (const [variable, conditions, initial, selected, screenshot] of [
    ['pH', base, 7, 5.5, 'sweep-ph-phone-320.png'],
    ['oxygen', prior, 100, 5, 'sweep-oxygen-phone-320.png'],
  ] as const) {
    await mount(page, seed(variable, conditions));
    const restored = clone(await state(page)), samples = await oracle(page, { variable, conditions });
    await page.setViewportSize({ width: 320, height: 844 });
    await assertLayout(page); await assertSweep(page, samples, initial);
    await inspect(page, selected); await assertLayout(page); await assertSweep(page, samples, selected);
    expect(await state(page)).toEqual(restored); expect(await counters(page)).toEqual({ xp: [], random: 0 });
    await figure(page).screenshot({ path: path.join(out, screenshot) });
    await harness.unmount(page);
  }
});

test('preparing a current sweep sample changes only normalized next-trial conditions and preserves all original notebook evidence and metadata', async ({ page }) => {
  await mount(page); await open(page.locator('#gl-previous-sweep'));
  const current = await oracle(page, { variable: 'tempC', conditions: base }), previous = await oracle(page, { variable: 'pH', conditions: prior });
  await inspect(page, 45); await inspect(page, 5.5, true);
  const before = clone(await state(page)), savedView = await page.locator('#gl-saved-result').innerText(), originalCurves = [await curve(page), await curve(page, true)];
  const prepared = current.samples.find(sample => sample.value === 30)!;
  const action = evidence(page).getByRole('button', { name: 'Use this setting as the next trial: Temperature 30 °C', exact: true });
  await action.focus(); await action.press('Enter');
  const expected = clone(before); expected.microbiology.growthLab = { ...before.microbiology.growthLab, ...prepared.conditions };
  expect(await state(page)).toEqual(expected); await expect(action).toHaveAttribute('aria-pressed', 'true');
  await expect(evidence(page, true).locator('.micro-growth-sweep-table button')).toHaveCount(0);
  expect(await page.locator('#gl-saved-result').innerText()).toBe(savedView);
  expect([await curve(page), await curve(page, true)]).toEqual(originalCurves);
  await assertSweep(page, current, 45); await assertSweep(page, previous, 5.5, true);
  expect(await counters(page)).toEqual({ xp: [], random: 0 });
  const afterPrepare = clone(await state(page)); await inspect(page, 30); await inspect(page, 7.5, true);
  expect(await state(page)).toEqual(afterPrepare);
});

test('JSON reload and notebook export retain both saved sweep descriptors and model-exact samples regardless of local inspection', async ({ page }) => {
  await mount(page); await open(page.locator('#gl-previous-sweep'));
  const current = await oracle(page, { variable: 'tempC', conditions: base }), previous = await oracle(page, { variable: 'pH', conditions: prior });
  const before = clone(await state(page));
  const originalExport = await downloadNotebook(page, 'sweep-original-notebook.txt');
  await inspect(page, 0); await inspect(page, 10, true);
  const inspectedExport = await downloadNotebook(page, 'sweep-inspected-notebook.txt');
  expect(inspectedExport).toBe(originalExport); expect(await state(page)).toEqual(before);
  const sections = [originalExport.slice(originalExport.indexOf('\nCurrent sweep\n') + 1, originalExport.indexOf('\nPrevious sweep\n')),
    originalExport.slice(originalExport.indexOf('\nPrevious sweep\n') + 1)];
  expect(originalExport).toContain('\nCurrent sweep\n'); expect(originalExport).toContain('\nPrevious sweep\n');
  for (const [index, sweep] of [current, previous].entries()) {
    for (const sample of sweep.samples) expect(sections[index]).toContain(settingText(sweep.variable, sample.value) + '\t' + sample.population.toFixed(1) + '\t' + sample.lag.toFixed(1));
  }
  expect(originalExport).not.toContain('987654321'); expect(originalExport).not.toContain('-999');
  const serialized = JSON.stringify(before); writeFileSync(path.join(out, 'sweep-restored-state.json'), serialized + '\n');
  await harness.unmount(page); await page.reload(); await page.waitForFunction(() => typeof (window as any).__mount === 'function');
  await page.evaluate(json => (window as any).__mount(JSON.parse(json)), serialized); await page.addStyleTag({ content: layoutStyle }); await instrument(page);
  await open(page.locator('.micro-growth-sweep')); await open(page.locator('#gl-previous-sweep'));
  await assertSweep(page, current, 37); await assertSweep(page, previous, 7.5, true);
  expect(await state(page)).toEqual(before); expect(await counters(page)).toEqual({ xp: [], random: 0 });
  const restoredExport = await downloadNotebook(page, 'sweep-restored-notebook.txt'); expect(restoredExport).toBe(originalExport);
  expect(await state(page)).toEqual(before); expect(await counters(page)).toEqual({ xp: [], random: 0 });
});
