import { test, expect, type Locator, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

test.use({ video: 'off' });
test.describe.configure({ retries: 0, timeout: 150000 });
const out = path.resolve(process.env.MICROBIOLOGY_REPORT_DIR || 'reports/micro-lab-growth-chart-2026-10-04');
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_microbiology.js', toolId: 'microbiology', width: 1280, height: 960, layout: 'document' });
const layoutStyle = '#wrap{width:100%!important}body{margin:0;font-family:system-ui,sans-serif}button,input,select,textarea{font-family:inherit}';
const base = { profile: 'ecoli', tempC: 37, pH: 7, oxygen: 100 };
const trialConditions = { ...base, tempC: 35 };
const nextControl = { profile: 'thermus', tempC: 65, pH: 7.5, oxygen: 100 };
const literal = '<img src=x onerror="window.__growthVisualInjected=true"> Keep imported chart evidence literal.';
const originalExplanation = '=SUM(1,2)\nEarlier populations differ, "even when their final values are similar."';
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const state = (page: Page) => page.evaluate(() => (window as any).__toolData);
const figure = (page: Page) => page.locator('#gl-growth-visual');
const chart = (page: Page) => page.locator('#gl-growth-chart');
const paths = (page: Page) => chart(page).locator('[data-growth-series]').evaluateAll(nodes => nodes.map(node => node.getAttribute('d')));
const counters = (page: Page) => page.evaluate(() => ({ xp: (window as any).__growthVisualXP, random: (window as any).__growthVisualRandom }));
type ModelPoint = { hour: number; population: number };
type ModelCurves = { control: ModelPoint[]; trial: ModelPoint[] };
let errors: string[];

function seed(): Record<string, any> {
  return {
    tab: 'growthLab', showMicroLibrary: false, growthReviewHour: 6, earnedXP: 71,
    growthLab: { ...nextControl, tempC: 65, hypothesis: 'Independent legacy reasoning.', log: [{ profile: 'thermus', t: 65, p: 7.5, o: 100, state: 'Earlier recorded label.' }], legacyMetadata: { literal } },
    growthInvestigation: {
      trials: [
        { id: 7, control: { ...base, importedControl: { literal } }, conditions: { ...trialConditions, importedConditions: true }, prediction: 'similar',
          hypothesis: 'Early model populations may differ before similar final values.', explanation: originalExplanation, citedHours: [0, 6, 24],
          importedTrial: { literal, keep: [1, 2] }, forgedPopulation: 987654321 },
        { id: 42, conditions: base, prediction: 'lower', hypothesis: 'No original control was saved.', explanation: 'Keep the incomplete imported trial.', importedTrial: { literal } },
      ],
      selectedId: 7, nextId: 60, control: { ...nextControl, importedNextControl: true }, prediction: 'unsure',
      hypothesis: 'Next-run reasoning remains independent.', notebookMetadata: { literal },
      removed: { trial: { id: 19, control: base, conditions: { ...base, pH: 6 }, prediction: 'lower', hypothesis: 'Recoverable reasoning.', explanation: literal, importedRecovery: true }, index: 1 },
    },
    resistanceInvestigation: { dose: 0, duration: 8, initRes: 10, history: [{ day: 0, sensitive: 72, resistant: 8 }], importedResistance: { literal } },
    importedMetadata: { literal, keep: true },
  };
}
async function instrument(page: Page) {
  await page.evaluate(() => {
    const w = window as any; w.__growthVisualXP = []; w.__growthVisualRandom = 0;
    w.__ctx.awardXP = (...args: any[]) => w.__growthVisualXP.push(args);
    if (!w.__growthVisualOriginalRandom) {
      w.__growthVisualOriginalRandom = Math.random;
      Math.random = () => { w.__growthVisualRandom++; return w.__growthVisualOriginalRandom(); };
    }
    w.__rerender();
  });
}
async function mount(page: Page, data = seed()) {
  await page.setViewportSize({ width: 1280, height: 960 });
  await harness.mount(page, { unrelatedNotebook: { literal, keep: [1, 2, 3] }, microbiology: data }, undefined, { expectCanvas: false });
  await page.addStyleTag({ content: layoutStyle });
  await instrument(page);
  await expect(page.locator('[data-microbiology-tool]')).toBeVisible();
}
async function open(details: Locator) {
  if (!await details.evaluate(node => (node as HTMLDetailsElement).open)) {
    const summary = details.locator(':scope > summary'); await summary.focus(); await summary.press('Enter');
  }
  await expect(details).toHaveAttribute('open', '');
}
async function oracle(page: Page, control = base, conditions = trialConditions): Promise<ModelCurves> {
  // Read the established simulator independently of the chart and its selected-hour helpers.
  return page.evaluate(({ control, conditions }) => {
    const model = (window as any).__MicrobiologyCore.growth;
    return { control: model.simulate(control).points, trial: model.simulate(conditions).points };
  }, { control, conditions });
}
function withHour(before: any, hour: number) {
  const expected = clone(before); expected.microbiology.growthReviewHour = hour; return expected;
}
async function selectors(page: Page, hour: number) {
  for (const [id, name] of [['gl-chart-hour', 'Chart model hour'], ['gl-evidence-hour', 'Model hour to cite'], ['gl-review-hour', 'Inspect model hour']]) {
    await expect(page.locator('#' + id)).toHaveAccessibleName(name);
    await expect(page.locator('#' + id)).toHaveValue(String(hour));
  }
}
async function assertChart(page: Page, expected: ModelCurves, hour: number) {
  await expect(figure(page)).toBeVisible(); await expect(figure(page)).toHaveJSProperty('tagName', 'FIGURE');
  await expect(figure(page)).toHaveClass(/\bmicro-growth-figure\b/);
  await expect(chart(page)).toHaveAttribute('viewBox', '0 0 100 100');
  await expect(chart(page)).toHaveAttribute('role', 'img');
  expect(await chart(page).getAttribute('aria-label')).toBeTruthy();
  await expect(chart(page).locator('text')).toHaveCount(0);
  const geometry = await chart(page).evaluate(node => {
    const svg = node as SVGSVGElement;
    return {
      grids: [...svg.querySelectorAll('[data-growth-level]')].map(line => ({ level: Number(line.getAttribute('data-growth-level')),
        x1: Number(line.getAttribute('x1')), x2: Number(line.getAttribute('x2')), y1: Number(line.getAttribute('y1')), y2: Number(line.getAttribute('y2')) })),
      series: [...svg.querySelectorAll('[data-growth-series]')].map(line => ({ name: line.getAttribute('data-growth-series'), d: line.getAttribute('d') || '' })),
      guides: [...svg.querySelectorAll('[data-growth-hour-guide]')].map(line => ({ hour: Number(line.getAttribute('data-growth-hour-guide')),
        x1: Number(line.getAttribute('x1')), x2: Number(line.getAttribute('x2')), y1: Number(line.getAttribute('y1')), y2: Number(line.getAttribute('y2')) })),
    };
  });
  expect(geometry.grids.map(grid => grid.level).sort((a, b) => a - b)).toEqual([0, 25, 50, 75, 100]);
  for (const grid of geometry.grids) expect(grid).toEqual({ level: grid.level, x1: 0, x2: 100, y1: 100 - grid.level, y2: 100 - grid.level });
  expect(geometry.series.map(series => series.name).sort()).toEqual(['control', 'trial']);
  for (const series of geometry.series) {
    const coordinates = [...series.d.matchAll(/[ML]\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/g)].map(match => [Number(match[1]), Number(match[2])]);
    const points = expected[series.name as keyof ModelCurves];
    expect(coordinates).toHaveLength(25); expect(points).toHaveLength(25);
    points.forEach((point, index) => {
      expect(coordinates[index][0]).toBeCloseTo(point.hour / 24 * 100, 3);
      expect(coordinates[index][1]).toBeCloseTo(100 - point.population, 3);
    });
  }
  expect(geometry.guides).toHaveLength(1);
  expect(geometry.guides[0].hour).toBe(hour);
  expect(geometry.guides[0].x1).toBeCloseTo(hour / 24 * 100, 8);
  expect(geometry.guides[0].x2).toBeCloseTo(hour / 24 * 100, 8);
  expect(geometry.guides[0].y1).toBe(0); expect(geometry.guides[0].y2).toBe(100);
  const rendered = await page.locator('#gl-growth-plot').evaluate(element => {
    const plot = element.getBoundingClientRect(), svg = element.querySelector('svg') as SVGSVGElement;
    const guide = svg.querySelector('[data-growth-hour-guide]')!.getBoundingClientRect();
    const markers = [...element.querySelectorAll('[data-growth-selected-marker]')].map(marker => {
      const box = marker.getBoundingClientRect(), style = getComputedStyle(marker), shape = marker.querySelector('span')!, shapeStyle = getComputedStyle(shape);
      const matrix = new DOMMatrix(shapeStyle.transform === 'none' ? undefined : shapeStyle.transform);
      return { name: marker.getAttribute('data-growth-selected-marker'), hour: Number(marker.getAttribute('data-hour')), value: Number(marker.getAttribute('data-value')),
        centerX: box.x + box.width / 2, centerY: box.y + box.height / 2, width: parseFloat(style.width), height: parseFloat(style.height),
        innerCount: marker.querySelectorAll('span').length, innerWidth: parseFloat(shapeStyle.width), innerHeight: parseFloat(shapeStyle.height),
        borderWidth: parseFloat(shapeStyle.borderTopWidth), borderRadius: shapeStyle.borderTopLeftRadius, background: shapeStyle.backgroundColor,
        rotation: Math.atan2(matrix.b, matrix.a) * 180 / Math.PI };
    });
    return { plot: { x: plot.x, y: plot.y, width: plot.width, height: plot.height }, guideX: guide.x + guide.width / 2, markers };
  });
  expect(rendered.markers.map(marker => marker.name).sort()).toEqual(['control', 'trial']);
  expect(Math.abs(rendered.guideX - (rendered.plot.x + hour / 24 * rendered.plot.width))).toBeLessThan(1);
  for (const marker of rendered.markers) {
    const value = expected[marker.name as keyof ModelCurves][hour].population;
    expect(marker.hour).toBe(hour); expect(marker.value).toBeCloseTo(value, 8); expect(marker.innerCount).toBe(1);
    expect(Math.abs(marker.centerX - (rendered.plot.x + hour / 24 * rendered.plot.width))).toBeLessThan(1);
    expect(Math.abs(marker.centerY - (rendered.plot.y + (100 - value) / 100 * rendered.plot.height))).toBeLessThan(1);
    expect(marker.height).toBe(marker.width); expect(marker.innerWidth).toBeCloseTo(marker.width, 4); expect(marker.innerHeight).toBeCloseTo(marker.height, 4);
    if (marker.name === 'control') {
      expect(marker.width).toBe(18); expect(marker.borderWidth).toBeGreaterThanOrEqual(3); expect(marker.borderRadius).toBe('50%');
      expect(marker.background).toMatch(/rgba\([^)]*,\s*0\)$|transparent/);
    } else { expect(marker.width).toBe(11); expect(marker.rotation).toBeCloseTo(45, 2); expect(marker.borderWidth).toBeGreaterThan(0); }
  }
  const ticks = await page.locator('#gl-growth-axes').evaluate(element => {
    const axis = element.querySelector(':scope > div')!;
    return [...axis.querySelectorAll('span')].map(label => {
      const level = Number(label.textContent), box = label.getBoundingClientRect();
      const line = document.querySelector('#gl-growth-chart [data-growth-level="' + level + '"]')!.getBoundingClientRect();
      return { level, centerY: box.y + box.height / 2, gridY: line.y + line.height / 2, fontSize: parseFloat(getComputedStyle(label).fontSize) };
    });
  });
  expect(ticks.map(tick => tick.level)).toEqual([100, 75, 50, 25, 0]);
  for (const tick of ticks) { expect(Math.abs(tick.centerY - tick.gridY)).toBeLessThan(1); expect(tick.fontSize).toBeGreaterThanOrEqual(14); }
  const hourTicks = await page.locator('.micro-growth-chart-x span').evaluateAll(nodes => nodes.map(node => {
    const box = node.getBoundingClientRect(), style = getComputedStyle(node);
    const zoom = parseFloat(getComputedStyle(document.body).zoom) || 1;
    return { hour: Number(node.textContent), height: box.height / zoom, lineHeight: parseFloat(style.lineHeight), fontSize: parseFloat(style.fontSize) };
  }));
  expect(hourTicks.map(tick => tick.hour)).toEqual([0, 6, 12, 18, 24]);
  for (const tick of hourTicks) { expect(tick.height).toBeLessThanOrEqual(tick.lineHeight + 1); expect(tick.fontSize).toBeGreaterThanOrEqual(14); }
  const controlPopulation = expected.control[hour].population, trialPopulation = expected.trial[hour].population;
  const difference = trialPopulation - controlPopulation;
  const values = page.locator('#gl-growth-hour-values'); await expect(values).toHaveJSProperty('tagName', 'DL');
  await expect(values.locator('dt')).toHaveCount(3);
  for (const [name, value] of [['control', controlPopulation], ['trial', trialPopulation], ['difference', difference]] as const) {
    const readout = values.locator('[data-growth-hour-value="' + name + '"]');
    expect(Number(await readout.getAttribute('data-value'))).toBeCloseTo(value, 8);
    await expect(readout).toHaveText((name === 'difference' && value > 0 ? '+' : '') + value.toFixed(1));
    expect(await readout.evaluate(element => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(14);
  }
  await expect(page.locator('#gl-growth-selected-hour')).toHaveText('Selected model hour: ' + hour);
}
async function assertLayout(page: Page) {
  const viewport = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
  expect(viewport.scroll <= viewport.width + 1, JSON.stringify(viewport)).toBe(true);
  for (const node of [figure(page), page.locator('#gl-growth-axes'), page.locator('#gl-growth-hour-values')]) {
    const bounds = await node.evaluate(element => ({ id: element.id, client: element.clientWidth, scroll: element.scrollWidth }));
    expect(bounds.scroll <= bounds.client + 1, JSON.stringify(bounds)).toBe(true);
  }
  const selector = page.locator('#gl-chart-hour'); await selector.focus(); await expect(selector).toBeFocused();
  const style = await selector.evaluate(element => {
    const s = getComputedStyle(element), box = element.getBoundingClientRect();
    return { outline: s.outlineStyle, outlineWidth: parseFloat(s.outlineWidth), height: parseFloat(s.height), fontSize: parseFloat(s.fontSize), x: box.x, right: box.right };
  });
  expect(style.outline).not.toBe('none'); expect(style.outlineWidth).toBeGreaterThan(0);
  expect(style.height).toBeGreaterThanOrEqual(42); expect(style.fontSize).toBeGreaterThanOrEqual(14);
  expect(style.x).toBeGreaterThanOrEqual(0); expect(style.right).toBeLessThanOrEqual(viewport.width + 1);
}
async function assertForcedColourContrast(page: Page) {
  const rendered = await chart(page).evaluate(svg => {
    const probe = document.createElement('span');
    probe.style.cssText = 'position:fixed;left:0;top:0;visibility:hidden;pointer-events:none;forced-color-adjust:none;background:Canvas;color:CanvasText';
    document.body.appendChild(probe);
    try {
      function rgba(colour: string) {
        if (!/^rgba?\(/.test(colour)) throw new Error('Expected a resolved RGB colour, received ' + colour);
        const values = colour.match(/[\d.]+/g)!.map(Number);
        return [values[0], values[1], values[2], values[3] === undefined ? 1 : values[3]];
      }
      function luminance(rgb: number[]) {
        const channels = rgb.slice(0, 3).map(value => {
          const channel = value / 255;
          return channel <= 0.04045 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
        });
        return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
      }
      const canvasColour = getComputedStyle(probe).backgroundColor, canvas = rgba(canvasColour), canvasLuminance = luminance(canvas);
      const lines = [...svg.querySelectorAll('[data-growth-series], [data-growth-hour-guide]')].map(line => {
        const style = getComputedStyle(line), stroke = style.stroke;
        // Resolve a system-colour stroke without forcing the probe's authored colour to CanvasText.
        probe.style.color = stroke;
        const paint = rgba(getComputedStyle(probe).color);
        let opacity = Number(style.strokeOpacity);
        for (let node: Element | null = line; node; node = node.parentElement) opacity *= Number(getComputedStyle(node).opacity);
        const alpha = paint[3] * opacity;
        const composite = paint.slice(0, 3).map((value, index) => value * alpha + canvas[index] * (1 - alpha));
        const strokeLuminance = luminance(composite);
        return { name: line.getAttribute('data-growth-series') || 'guide', stroke, opacity, strokeWidth: parseFloat(style.strokeWidth), dasharray: style.strokeDasharray,
          contrast: (Math.max(strokeLuminance, canvasLuminance) + 0.05) / (Math.min(strokeLuminance, canvasLuminance) + 0.05) };
      });
      return { canvasColour, canvasAlpha: canvas[3], lines };
    } finally { probe.remove(); }
  });
  expect(rendered.canvasAlpha).toBe(1);
  expect(rendered.lines.map(line => line.name)).toEqual(['control', 'trial', 'guide']);
  expect(rendered.lines[0].dasharray).not.toBe('none'); expect(rendered.lines[0].dasharray).not.toBe('');
  expect(rendered.lines[1].dasharray).toBe('none');
  for (const line of rendered.lines) {
    expect(line.strokeWidth).toBeGreaterThan(0);
    expect(line.contrast, JSON.stringify({ canvas: rendered.canvasColour, ...line })).toBeGreaterThanOrEqual(3);
  }
}
function readQuotedCSV(csv: string): Record<string, string>[] {
  const records: string[][] = []; let row: string[] = [];
  const cells = [...csv.matchAll(/"((?:[^"]|"")*)"(,|\r\n|$)/g)];
  expect(cells.map(cell => cell[0]).join('')).toBe(csv);
  for (const cell of cells) { row.push(cell[1].replace(/""/g, '"')); if (cell[2] !== ',') { records.push(row); row = []; } }
  const [headings, ...data] = records;
  return data.map(values => { expect(values).toHaveLength(headings.length); return Object.fromEntries(headings.map((heading, index) => [heading, values[index]])); });
}
async function download(page: Page, button: Locator, filename: string) {
  const pending = page.waitForEvent('download'); await button.focus(); await button.press('Enter');
  const downloaded = await pending; expect(downloaded.suggestedFilename()).toBe(filename);
  const file = path.join(out, filename); await downloaded.saveAs(file); return readQuotedCSV(readFileSync(file, 'utf8'));
}

test.beforeAll(async () => { mkdirSync(out, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.beforeEach(async ({ page }) => { errors = []; page.on('pageerror', error => errors.push(error.message)); });
test.afterEach(async ({ page }) => { try { expect(errors).toEqual([]); } finally { await harness.unmount(page); } });

test('restored selected-hour geometry uses the saved original control while preserving imported evidence and the next-run draft', async ({ page }) => {
  await mount(page); const before = clone(await state(page));
  const expected = await oracle(page), incorrectCurrent = await oracle(page, nextControl);
  expect(expected.control[6].population).not.toBeCloseTo(incorrectCurrent.control[6].population, 2);
  await assertChart(page, expected, 6);
  await expect(page.locator('#gl-hypothesis')).toHaveValue('Next-run reasoning remains independent.');
  await expect(page.locator('#gl-explanation')).toHaveValue(originalExplanation);
  await expect(page.locator('.micro-growth-result-head')).toContainText('Observed result: Similar population');
  await expect(page.locator('.micro-growth-result-head')).toContainText('Original prediction: Similar population');
  await expect(page.locator('[data-microbiology-tool] img[src="x"]')).toHaveCount(0);
  expect(await page.evaluate(() => Boolean((window as any).__growthVisualInjected))).toBe(false);
  expect(await state(page)).toEqual(before); expect(await counters(page)).toEqual({ xp: [], random: 0 });
  await figure(page).screenshot({ path: path.join(out, 'growth-chart-desktop.png') });
});

test('chart, citation and review selectors synchronize hours zero, six and twenty-four without changing full curves or final outcomes', async ({ page }) => {
  await mount(page); await open(page.locator('.micro-growth-review'));
  await open(page.locator('#gl-growth-data-table').locator('xpath=ancestor::details[1]'));
  const expected = await oracle(page), originalPaths = await paths(page), result = await page.locator('.micro-growth-result-head').innerText();
  const finalMetrics = await page.locator('.micro-growth-metrics').innerText();
  for (const [id, hour] of [['gl-chart-hour', 0], ['gl-evidence-hour', 6], ['gl-review-hour', 24]] as const) {
    const before = clone(await state(page)); await page.locator('#' + id).selectOption(String(hour));
    await selectors(page, hour); await assertChart(page, expected, hour);
    await expect(page.locator('#gl-growth-data-table tbody tr[aria-current="true"]')).toHaveCount(1);
    const selectedRow = page.locator('#gl-growth-data-table tbody tr[aria-current="true"]');
    await expect(selectedRow).toHaveAttribute('data-growth-hour', String(hour));
    await expect(selectedRow.locator('th')).toHaveText(String(hour));
    await expect(selectedRow.locator('td')).toHaveText([expected.control[hour].population.toFixed(1), expected.trial[hour].population.toFixed(1)]);
    expect(await state(page)).toEqual(withHour(before, hour)); expect(await paths(page)).toEqual(originalPaths);
    expect(await page.locator('.micro-growth-result-head').innerText()).toBe(result);
    expect(await page.locator('.micro-growth-metrics').innerText()).toBe(finalMetrics);
  }
  expect(await counters(page)).toEqual({ xp: [], random: 0 });
  await figure(page).screenshot({ path: path.join(out, 'growth-chart-hour-24.png') });
});

test('overlapping curves retain both marker shapes at hour zero while missing controls and empty restored notebooks show no fabricated comparison', async ({ page }) => {
  const data = seed(); data.growthReviewHour = 0; data.growthInvestigation.trials[0].conditions = { ...base, importedConditions: true };
  await mount(page, data); const before = clone(await state(page));
  const identical = await oracle(page, base, base); await assertChart(page, identical, 0);
  const overlappingPaths = await paths(page); expect(overlappingPaths).toHaveLength(2); expect(overlappingPaths[0]).toBe(overlappingPaths[1]);
  const shapes = await page.locator('[data-growth-selected-marker]').evaluateAll(nodes => nodes.map(node => ({
    name: node.getAttribute('data-growth-selected-marker'), box: node.getBoundingClientRect().toJSON(),
  })));
  expect(shapes).toHaveLength(2); expect(shapes[0].box.width).not.toBe(shapes[1].box.width);
  expect(shapes[0].box.x + shapes[0].box.width / 2).toBeCloseTo(shapes[1].box.x + shapes[1].box.width / 2, 5);
  expect(shapes[0].box.y + shapes[0].box.height / 2).toBeCloseTo(shapes[1].box.y + shapes[1].box.height / 2, 5);
  expect(await state(page)).toEqual(before); expect(await counters(page)).toEqual({ xp: [], random: 0 });
  await figure(page).screenshot({ path: path.join(out, 'growth-chart-overlap.png') });
  await page.locator('#gl-trial-42').click(); const missing = clone(await state(page));
  await expect(figure(page)).toHaveCount(0); await expect(chart(page)).toHaveCount(0); await expect(page.locator('#gl-chart-hour')).toHaveCount(0);
  await expect(page.locator('#gl-saved-result')).toContainText('control');
  expect(missing.microbiology.growthInvestigation.trials).toEqual(before.microbiology.growthInvestigation.trials);
  expect(missing.unrelatedNotebook).toEqual(before.unrelatedNotebook);
  await harness.unmount(page);
  const empty = seed(); empty.growthInvestigation = { control: { ...nextControl, importedNextControl: true }, prediction: 'higher', hypothesis: 'Draft-only reasoning.', notebookMetadata: { literal }, trials: [], selectedId: null, nextId: 60 };
  await mount(page, empty); const emptyBefore = clone(await state(page));
  await expect(figure(page)).toHaveCount(0); await expect(chart(page)).toHaveCount(0); await expect(page.locator('#gl-chart-hour')).toHaveCount(0);
  await expect(page.locator('#gl-saved-result')).toHaveCount(0); await expect(page.locator('#gl-hypothesis')).toHaveValue('Draft-only reasoning.');
  expect(await state(page)).toEqual(emptyBefore); expect(await counters(page)).toEqual({ xp: [], random: 0 });
});

test('phone, four-hundred-percent zoom, reduced-motion and forced-colour layouts keep labels and marker shapes readable with keyboard focus', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await mount(page); const before = clone(await state(page)), expected = await oracle(page);
  expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
  await page.setViewportSize({ width: 320, height: 844 }); await assertLayout(page); await assertChart(page, expected, 6);
  await figure(page).screenshot({ path: path.join(out, 'growth-chart-phone-320.png') });
  await page.setViewportSize({ width: 1280, height: 960 }); await page.evaluate(() => { document.body.style.zoom = '4'; });
  await assertLayout(page); await assertChart(page, expected, 6);
  await figure(page).screenshot({ path: path.join(out, 'growth-chart-400-percent.png') });
  await page.evaluate(() => { document.body.style.zoom = '1'; document.body.classList.add('theme-contrast'); });
  await assertLayout(page); await assertChart(page, expected, 6);
  const themeStrokes = await chart(page).locator('[data-growth-series]').evaluateAll(nodes => nodes.map(node => getComputedStyle(node).stroke));
  expect(themeStrokes).toEqual(['rgb(255, 255, 0)', 'rgb(0, 255, 0)']);
  for (const colorScheme of ['dark', 'light'] as const) {
    await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: 'active', colorScheme });
    expect(await page.evaluate(() => matchMedia('(forced-colors: active)').matches)).toBe(true);
    expect(await page.evaluate(scheme => matchMedia('(prefers-color-scheme: ' + scheme + ')').matches, colorScheme)).toBe(true);
    await assertLayout(page); await assertChart(page, expected, 6); await assertForcedColourContrast(page);
    const axisColors = await page.locator('#gl-growth-axes span').evaluateAll(nodes => nodes.map(node => getComputedStyle(node).color));
    expect(axisColors.every(color => !/rgba\([^)]*, 0\)|transparent/.test(color))).toBe(true);
  }
  await figure(page).screenshot({ path: path.join(out, 'growth-chart-contrast.png') });
  expect(await state(page)).toEqual(before);
  const selector = page.locator('#gl-chart-hour'); await selector.focus(); await selector.press('End');
  await expect(selector).toHaveValue('24'); await expect(selector).toBeFocused(); await assertChart(page, expected, 24);
  expect(await state(page)).toEqual(withHour(before, 24)); expect(await counters(page)).toEqual({ xp: [], random: 0 });
});

test('JSON reload and comparison CSV agree with the inspected chart while the original trial CSV retains hour-twenty-four outcomes', async ({ page }) => {
  await mount(page); const expected = await oracle(page), saved = clone(await state(page));
  const serialized = JSON.stringify(saved); writeFileSync(path.join(out, 'growth-chart-restored-state.json'), serialized + '\n');
  await harness.unmount(page); await page.reload(); await page.waitForFunction(() => typeof (window as any).__mount === 'function');
  await page.evaluate(json => (window as any).__mount(JSON.parse(json)), serialized); await page.addStyleTag({ content: layoutStyle }); await instrument(page);
  await expect(figure(page)).toBeVisible(); expect(await state(page)).toEqual(saved); await assertChart(page, expected, 6);
  await open(page.locator('.micro-growth-review')); await selectors(page, 6);
  const before = clone(await state(page)), result = await page.locator('.micro-growth-result-head').innerText();
  const rows = await download(page, page.getByRole('button', { name: 'Download comparison at hour 6', exact: true }), 'micro-lab-comparison-hour-6.csv');
  expect(rows.map(row => row.trial_id)).toEqual(['7', '42']);
  expect(rows[0]).toMatchObject({ inspection_hour: '6', control_profile: 'ecoli', control_temperature_C: '37', trial_temperature_C: '35',
    original_prediction: 'similar', outcome_at_24h: 'similar', explanation: "'" + originalExplanation, population_units: 'arbitrary population units' });
  expect(Number(rows[0].control_population_at_inspection_hour)).toBeCloseTo(expected.control[6].population, 2);
  expect(Number(rows[0].trial_population_at_inspection_hour)).toBeCloseTo(expected.trial[6].population, 2);
  expect(Number(rows[0].difference_at_inspection_hour)).toBeCloseTo(expected.trial[6].population - expected.control[6].population, 2);
  expect(rows[1]).toMatchObject({ inspection_hour: '6', control_profile: '', control_population_at_inspection_hour: '', difference_at_inspection_hour: '', outcome_at_24h: '' });
  const originalRows = await download(page, page.getByRole('button', { name: 'Download trial CSV', exact: true }), 'micro-lab-trials.csv');
  expect(Number(originalRows[0].control_population_at_24h)).toBeCloseTo(expected.control[24].population, 2);
  expect(Number(originalRows[0].trial_population_at_24h)).toBeCloseTo(expected.trial[24].population, 2);
  expect(originalRows[0].modeled_outcome).toBe('similar'); expect(originalRows[0]).not.toHaveProperty('inspection_hour');
  expect(await state(page)).toEqual(before); expect(await page.locator('.micro-growth-result-head').innerText()).toBe(result);
  await assertChart(page, expected, 6); expect(await counters(page)).toEqual({ xp: [], random: 0 });
});
