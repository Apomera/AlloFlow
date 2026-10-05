import { test, expect, type Locator, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

test.use({ video: 'off' });
test.describe.configure({ retries: 0, timeout: 150000 });
const out = path.resolve(process.env.MICROBIOLOGY_REPORT_DIR || 'reports/micro-lab-resistance-history-2026-10-04');
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_microbiology.js', toolId: 'microbiology', width: 1280, height: 960, layout: 'document' });
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const state = (page: Page) => page.evaluate(() => (window as any).__toolData);
const round = (page: Page) => page.getByLabel('Shared comparison round', { exact: true });
const panel = (page: Page) => page.locator('#micro-resistance-comparison');
const chart = (page: Page, metric: 'count' | 'share') => page.locator('#micro-resistance-history-' + metric);
const plot = (page: Page, metric: 'count' | 'share') => page.locator('#micro-resistance-history-' + metric + '-plot');
const figure = (page: Page, metric: 'count' | 'share') => chart(page, metric).locator('xpath=ancestor::figure[1]');
const marker = (page: Page, metric: 'count' | 'share', series: 'a' | 'b') => plot(page, metric).locator(`[data-resistance-history-marker="${series}"]`);
const selected = (page: Page, metric: 'count' | 'share', series: 'a' | 'b') => plot(page, metric).locator(`[data-resistance-selected-marker="${series}"]`);
const literal = '<img src=x onerror="window.__visualInjected=true"> Imported evidence stays literal.';
const longNote = 'Preserve imported observations and uncertainty. '.repeat(65) + ' ORIGINAL END';
let errors: string[];

test.beforeAll(async () => { mkdirSync(out, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.beforeEach(async ({ page }) => { errors = []; page.on('pageerror', error => errors.push(error.message)); });
test.afterEach(async ({ page }) => { try { expect(errors).toEqual([]); } finally { await harness.unmount(page); } });

const snapshotA = { dose: 30, duration: 3, initRes: 10, prediction: 'increase', notes: longNote,
  history: [{ day: 0, sensitive: 72, resistant: 8 }, { day: 1, sensitive: 60, resistant: 8 }, { day: 2, sensitive: 50, resistant: 8 }, { day: 3, sensitive: 40, resistant: 8 }] };
const snapshotB = { dose: 60, duration: 8, initRes: 10, prediction: 'increase', notes: literal,
  history: [{ day: 0, sensitive: 72, resistant: 8 }, { day: 1, sensitive: 2, resistant: 6 }, { day: 2, sensitive: 0, resistant: 4 }] };
const extinct = { dose: 100, duration: 3, initRes: 0, prediction: 'extinct', explanation: 'extinction', explanationSubmitted: true, notes: 'No survivors at round 1.',
  history: [{ day: 0, sensitive: 80, resistant: 0 }, { day: 1, sensitive: 0, resistant: 0 }] };
function record(id: number | string, evidence: any) {
  return { id, evidence: { ...clone(evidence), importedEvidence: { literal } }, reviewNote: longNote, importedRecord: { literal, original: ['Preserve provenance.'] } };
}
function seed(): Record<string, any> {
  return { tab: 'resistance', showMicroLibrary: false, earnedXP: 53,
    resistanceInvestigation: { dose: 0, duration: 3, initRes: 10, prediction: 'similar', notes: 'Independent current culture notes.',
      history: [0, 1, 2, 3].map(day => ({ day, sensitive: 72, resistant: 8 })), runAwarded: true, explanationAwarded: false },
    resistanceNotebook: { records: [record(7, snapshotA), record(4, snapshotB), record(9, extinct)], selectedId: 7, nextId: 40,
      importedNotebook: { literal }, removed: { record: record(30, snapshotB), index: 1, importedRecovery: true } },
    resistanceComparison: { aId: 7, bId: 4, round: null, rawPreference: { literal, keep: true } },
    growthLab: { profile: 'ecoli', tempC: 18, pH: 7, oxygen: 100, hypothesis: 'Keep the next Growth hypothesis.' },
    metadata: { literal, notes: 'Keep unrelated Micro Lab state.' } };
}
async function open(details: Locator) {
  if (!await details.evaluate(node => (node as HTMLDetailsElement).open)) {
    await details.locator(':scope > summary').focus(); await details.locator(':scope > summary').press('Enter');
  }
  await expect(details).toHaveAttribute('open', '');
}
async function instrument(page: Page) {
  await page.evaluate(() => {
    const w = window as any;
    w.__visualXP = []; w.__visualRandom = 0; w.__ctx.awardXP = (...args: any[]) => w.__visualXP.push(args);
    if (!w.__visualOriginalRandom) {
      w.__visualOriginalRandom = Math.random;
      Math.random = () => { w.__visualRandom++; return w.__visualOriginalRandom(); };
    }
    w.__rerender();
  });
}
async function mount(page: Page, data = seed()) {
  await page.setViewportSize({ width: 1280, height: 960 });
  await harness.mount(page, { unrelatedTool: { note: literal, metadata: [1, 2, 3] }, microbiology: data }, undefined, { expectCanvas: false });
  await page.addStyleTag({ content: '#wrap{width:100%!important}body{margin:0;font-family:system-ui,sans-serif}button,input,select,textarea{font-family:inherit}' });
  await expect.poll(async () => (await state(page)).microbiology.resistanceInvestigation.day).toBe(data.resistanceInvestigation.history.length - 1);
  await open(panel(page)); await instrument(page);
}
const counters = (page: Page) => page.evaluate(() => ({ xp: (window as any).__visualXP, random: (window as any).__visualRandom }));
function withRound(before: any, selectedRound: number | null) {
  const expected = clone(before); expected.microbiology.resistanceComparison.round = selectedRound; return expected;
}
async function geometry(node: Locator) {
  return node.evaluate(element => {
    const svg = element as SVGSVGElement, guide = svg.querySelector('[data-resistance-history-guide]')!, plot = document.getElementById(svg.id + '-plot')!;
    const bounds = plot.getBoundingClientRect(), zoom = parseFloat(getComputedStyle(document.body).zoom) || 1;
    const numbers = (name: string) => Number(guide.getAttribute(name));
    const inspect = (point: Element) => {
      const box = point.getBoundingClientRect(), style = getComputedStyle(point);
      return { series: point.getAttribute('data-resistance-history-marker'), round: Number(point.getAttribute('data-round')),
        selected: point.getAttribute('data-resistance-selected-marker'), value: Number(point.getAttribute('data-value')),
        x: (box.x + box.width / 2 - bounds.x) / bounds.width * 100, y: (box.y + box.height / 2 - bounds.y) / bounds.height * 100,
        width: parseFloat(style.width), height: parseFloat(style.height), radius: style.borderRadius, transform: style.transform,
        paintedWidth: box.width / zoom, paintedHeight: box.height / zoom, namespace: point.namespaceURI, tag: point.tagName.toLowerCase() };
    };
    const points = [...plot.querySelectorAll('[data-resistance-history-marker]')].map(inspect);
    const selected = [...plot.querySelectorAll('[data-resistance-selected-marker]')].map(inspect);
    return { min: Number(svg.getAttribute('data-min')), max: Number(svg.getAttribute('data-max')), last: Number(svg.getAttribute('data-last-round')),
      bounds: { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height }, zoom,
      guide: { round: Number(guide.getAttribute('data-resistance-history-guide')), x: numbers('x1'), top: numbers('y1'), bottom: numbers('y2') }, points, selected };
  });
}
async function assertGeometry(page: Page, metric: 'count' | 'share', expectedA: (number | null)[], expectedB: (number | null)[], selectedRound: number) {
  const model = await geometry(chart(page, metric));
  const last = Math.min(expectedA.length, expectedB.length) - 1;
  expect(model.min).toBe(0); expect(model.max).toBe(metric === 'count' ? 80 : 100); expect(model.last).toBe(last);
  await expect(chart(page, metric)).toHaveAttribute('viewBox', '0 0 100 100'); await expect(chart(page, metric)).toHaveAttribute('preserveAspectRatio', 'none');
  expect(model.guide.round).toBe(selectedRound); expect(model.guide.top).toBe(0); expect(model.guide.bottom).toBe(100);
  expect(model.guide.x).toBeCloseTo(selectedRound / Math.max(1, last) * 100, 3);
  for (const [series, values] of [['a', expectedA], ['b', expectedB]] as const) {
    const living = values.map((value, round) => ({ value, round })).filter(point => point.value !== null).slice(0, last + 1);
    const points = model.points.filter(point => point.series === series); expect(points.map(point => point.round)).toEqual(living.map(point => point.round));
    expect(points.map(point => point.value)).toEqual(living.map(point => point.value));
    for (const point of points) {
      expect(Math.abs(point.x - point.round / Math.max(1, last) * 100) / 100 * model.bounds.width).toBeLessThan(model.zoom);
      expect(Math.abs(point.y - (100 - point.value / model.max * 100)) / 100 * model.bounds.height).toBeLessThan(model.zoom);
      expect(point.namespace).toBe('http://www.w3.org/1999/xhtml'); expect(point.tag).toBe('span');
      expect(point.width).toBe(series === 'a' ? 6 : 7); expect(point.height).toBe(point.width);
      if (series === 'a') { expect(point.radius).toBe('50%'); expect(point.paintedWidth).toBeCloseTo(point.width, 2); }
      else { expect(point.radius).toBe('0px'); expect(point.transform).toMatch(/^matrix\(/); expect(point.paintedWidth).toBeCloseTo(point.width * Math.SQRT2, 2); }
    }
    const selectedPoint = model.selected.filter(point => point.selected === series);
    expect(selectedPoint).toHaveLength(values[selectedRound] === null ? 0 : 1);
    if (selectedPoint.length) {
      const point = selectedPoint[0]; expect(point.round).toBe(selectedRound); expect(point.value).toBe(values[selectedRound]);
      expect(point.series).toBe(null);
      expect(Math.abs(point.x - model.guide.x) / 100 * model.bounds.width).toBeLessThan(model.zoom);
      expect(Math.abs(point.y - (100 - point.value / model.max * 100)) / 100 * model.bounds.height).toBeLessThan(model.zoom);
      expect(point.width).toBe(series === 'a' ? 22 : 11); expect(point.height).toBe(point.width);
      expect(point.namespace).toBe('http://www.w3.org/1999/xhtml'); expect(point.tag).toBe('span');
      if (series === 'a') { expect(point.radius).toBe('50%'); expect(point.paintedWidth).toBeCloseTo(22, 2); }
      else { expect(point.radius).toBe('0px'); expect(point.transform).toMatch(/^matrix\(/); expect(point.paintedWidth).toBeCloseTo(11 * Math.SQRT2, 2); }
    }
    const commands = (await chart(page, metric).locator('[data-resistance-series="' + series + '"]').getAttribute('d') || '').match(/[ML]\s*[-\d.]+\s*[, ]\s*[-\d.]+/g) || [];
    expect(commands).toHaveLength(living.length);
    commands.forEach((command, index) => {
      const coordinates = command.match(/[-\d.]+/g)!.map(Number);
      expect(coordinates[0]).toBeCloseTo(living[index].round / Math.max(1, last) * 100, 3);
      expect(coordinates[1]).toBeCloseTo(100 - living[index].value! / model.max * 100, 3);
    });
  }
  const a = chart(page, metric).locator('[data-resistance-series="a"]'), b = chart(page, metric).locator('[data-resistance-series="b"]');
  await expect(a).toHaveCount(1); await expect(b).toHaveCount(1);
  expect([null, '', 'none']).toContain(await a.getAttribute('stroke-dasharray')); expect(await b.getAttribute('stroke-dasharray')).toMatch(/[1-9]/);
  const axes = await page.locator('#micro-resistance-history-' + metric + '-axes').evaluate(element => [...element.querySelectorAll('[data-resistance-history-y-label], [data-resistance-history-x-label]')].map(label => {
    const box = label.getBoundingClientRect(), style = getComputedStyle(label), zoom = parseFloat(getComputedStyle(document.body).zoom) || 1;
    return { y: label.hasAttribute('data-resistance-history-y-label'), value: Number(label.getAttribute('data-resistance-history-y-label') ?? label.getAttribute('data-resistance-history-x-label')),
      left: box.left, right: box.right, centerX: box.x + box.width / 2, centerY: box.y + box.height / 2, height: box.height / zoom,
      fontSize: parseFloat(style.fontSize), lineHeight: parseFloat(style.lineHeight) };
  }));
  const yTicks = axes.filter(label => label.y), xTicks = axes.filter(label => !label.y);
  expect(yTicks.map(label => label.value)).toEqual([model.max, model.max * .75, model.max * .5, model.max * .25, 0]);
  expect(xTicks[0].value).toBe(0); expect(xTicks[xTicks.length - 1].value).toBe(last);
  expect(xTicks.length).toBeLessThanOrEqual(Math.min(last + 1, 6));
  expect(xTicks.every((label, index) => Number.isInteger(label.value) && (index === 0 || label.value > xTicks[index - 1].value))).toBe(true);
  for (const label of axes) {
    expect(label.fontSize).toBeGreaterThanOrEqual(14); expect(label.height).toBeLessThanOrEqual(label.lineHeight + 1);
    if (label.y) expect(Math.abs(label.centerY - (model.bounds.y + (100 - label.value / model.max * 100) / 100 * model.bounds.height))).toBeLessThan(1);
    else {
      const anchor = label.value === 0 ? label.left : label.value === last ? label.right : label.centerX;
      expect(Math.abs(anchor - (model.bounds.x + label.value / Math.max(1, last) * model.bounds.width))).toBeLessThan(1);
    }
  }
  const values = page.locator('#micro-resistance-history-' + metric + '-values'); await expect(values).toHaveJSProperty('tagName', 'DL');
  await expect(values.locator('dt')).toHaveCount(3);
  const expectedValues = { a: expectedA[selectedRound], b: expectedB[selectedRound], difference: expectedA[selectedRound] === null || expectedB[selectedRound] === null ? null : expectedB[selectedRound]! - expectedA[selectedRound]! };
  for (const [series, value] of Object.entries(expectedValues)) {
    const reading = values.locator('[data-resistance-history-reading="' + series + '"]');
    await expect(reading).toHaveAttribute('data-value', value === null ? 'undefined' : String(value));
    await expect(reading).toHaveText(value === null ? 'Undefined' : series === 'difference' ? (value > 0 ? '+' : '') + value + (metric === 'count' ? ' cells' : ' percentage points') : value + (metric === 'count' ? ' cells' : '%'));
  }
}
async function download(page: Page, format: 'text' | 'csv', name: string) {
  const pending = page.waitForEvent('download'); await page.locator('#micro-resistance-comparison-download-' + format).click();
  const file = await pending, text = readFileSync((await file.path())!, 'utf8');
  await file.saveAs(path.join(out, name)); return { text, filename: file.suggestedFilename() };
}
async function noOverflow(page: Page) {
  const viewport = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth, zoom: getComputedStyle(document.body).zoom }));
  expect(viewport.scroll <= viewport.width + 1, JSON.stringify(viewport)).toBe(true);
  for (const node of [page.locator('[data-microbiology-tool]'), panel(page), figure(page, 'count'), figure(page, 'share'),
    page.locator('#micro-resistance-history-count-axes'), page.locator('#micro-resistance-history-share-axes'),
    page.locator('#micro-resistance-history-count-values'), page.locator('#micro-resistance-history-share-values'),
    page.locator('#micro-resistance-history-table'), round(page).locator('..')]) {
    const layout = await node.evaluate(element => ({ id: element.id, client: element.clientWidth, scroll: element.scrollWidth }));
    expect(layout.scroll <= layout.client + 1, JSON.stringify({ viewport, layout })).toBe(true);
  }
}
async function assertForcedColourContrast(page: Page) {
  const paints = await page.locator('#micro-resistance-history').evaluate(history => {
    const probe = document.createElement('span');
    probe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;forced-color-adjust:none;background:Canvas;color:CanvasText';
    document.body.appendChild(probe);
    try {
      const rgba = (colour: string) => { const values = colour.match(/[\d.]+/g)!.map(Number); return [values[0], values[1], values[2], values[3] ?? 1]; };
      const luminance = (rgb: number[]) => {
        const channels = rgb.slice(0, 3).map(value => { const c = value / 255; return c <= .04045 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4); });
        return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
      };
      const canvas = rgba(getComputedStyle(probe).backgroundColor), canvasLuminance = luminance(canvas);
      const contrast = (paint: string, opacity: number) => {
        probe.style.color = paint; const rgb = rgba(getComputedStyle(probe).color), alpha = rgb[3] * opacity;
        const composite = rgb.slice(0, 3).map((value, i) => value * alpha + canvas[i] * (1 - alpha)), actual = luminance(composite);
        return (Math.max(actual, canvasLuminance) + .05) / (Math.min(actual, canvasLuminance) + .05);
      };
      return [...history.querySelectorAll('[data-resistance-series], [data-resistance-history-guide], [data-resistance-history-marker], [data-resistance-selected-marker]')].map(node => {
        const style = getComputedStyle(node), svg = node instanceof SVGElement;
        const selected = node.hasAttribute('data-resistance-selected-marker');
        const hollow = selected || node.getAttribute('data-resistance-history-marker') === 'b';
        const paint = svg ? style.stroke : hollow ? style.borderTopColor : style.backgroundColor;
        let opacity = svg ? Number(style.strokeOpacity) : 1;
        for (let element: Element | null = node; element; element = element.parentElement) opacity *= Number(getComputedStyle(element).opacity);
        return { tag: node.tagName, selected, series: node.getAttribute('data-resistance-series') ?? node.getAttribute('data-resistance-history-marker') ?? node.getAttribute('data-resistance-selected-marker'),
          hollow, borderWidth: parseFloat(style.borderTopWidth), borderStyle: style.borderTopStyle, paint, opacity, contrast: contrast(paint, opacity) };
      });
    } finally { probe.remove(); }
  });
  expect(paints).toHaveLength(22);
  for (const paint of paints) {
    if (paint.hollow) { expect(paint.borderWidth, JSON.stringify(paint)).toBeGreaterThan(0); expect(paint.borderStyle).not.toBe('none'); expect(paint.borderStyle).not.toBe('hidden'); }
    expect(paint.contrast, JSON.stringify(paint)).toBeGreaterThanOrEqual(3);
  }
}
async function assertHistoryTableKeyboardScroll(page: Page) {
  const table = page.locator('#micro-resistance-history-table');
  const region = page.getByRole('region', { name: 'Shared Resistance history data', exact: true });
  await expect(region).toHaveAttribute('tabindex', '0');
  await expect(region.locator('#micro-resistance-history-table')).toHaveCount(1);
  const header = table.locator('thead th').first();
  await expect(header).toHaveText('Round');
  const headerLines = await header.evaluate(node => {
    const range = document.createRange(); range.selectNodeContents(node);
    return [...range.getClientRects()].filter(rect => rect.width > 0 && rect.height > 0).length;
  });
  expect(headerLines).toBe(1);
  const layout = await region.evaluate(node => {
    const element = node as HTMLElement, box = element.getBoundingClientRect();
    const panel = document.querySelector('#micro-resistance-comparison')!.getBoundingClientRect();
    return { client: element.clientWidth, scroll: element.scrollWidth, overflowX: getComputedStyle(element).overflowX,
      left: box.left, right: box.right, panelLeft: panel.left, panelRight: panel.right };
  });
  expect(layout.client).toBeGreaterThan(0); expect(layout.scroll).toBeGreaterThan(layout.client + 1);
  expect(layout.overflowX).toBe('auto');
  expect(layout.left).toBeGreaterThanOrEqual(layout.panelLeft - 1); expect(layout.right).toBeLessThanOrEqual(layout.panelRight + 1);
  await region.evaluate(node => { node.scrollLeft = 0; }); await region.focus(); await expect(region).toBeFocused();
  await expect.poll(async () => {
    await region.press('ArrowRight'); return region.evaluate(node => node.scrollLeft);
  }, { intervals: [100], timeout: 10000 }).toBeCloseTo(layout.scroll - layout.client, 0);
  const afterRight = await region.evaluate(node => node.scrollLeft); expect(afterRight).toBeGreaterThan(0);
  await expect.poll(async () => {
    await region.press('ArrowLeft'); return region.evaluate(node => node.scrollLeft);
  }, { intervals: [100], timeout: 10000 }).toBeCloseTo(0, 0);
  expect(await region.evaluate(node => node.scrollLeft)).toBeLessThan(afterRight); await expect(region).toBeFocused();
}

test('plots saved resistant counts and rounded shares on fixed axes so falling counts can accompany a rising share', async ({ page }) => {
  await mount(page); const before = await state(page);
  for (const metric of ['count', 'share'] as const) {
    await expect(chart(page, metric)).toHaveAttribute('role', 'img');
    const names = [(await chart(page, metric).getAttribute('aria-labelledby'))!, (await chart(page, metric).getAttribute('aria-describedby'))!].join(' ').split(/\s+/);
    expect(names).toContain('micro-resistance-history-' + metric + '-title');
    expect(names).toContain('micro-resistance-history-' + metric + '-description');
    expect(names.length).toBeGreaterThanOrEqual(2);
    for (const id of names) { await expect(page.locator('[id="' + id + '"]')).toHaveCount(1); expect(await page.locator('[id="' + id + '"]').textContent()).toBeTruthy(); }
    await expect(chart(page, metric).locator('text')).toHaveCount(0);
  }
  await assertGeometry(page, 'count', [8, 8, 8], [8, 6, 4], 2);
  await assertGeometry(page, 'share', [10, 12, 14], [10, 75, 100], 2);
  const countGeometry = await geometry(chart(page, 'count')), shareGeometry = await geometry(chart(page, 'share'));
  expect(countGeometry.points.map(point => point.x)).toEqual(shareGeometry.points.map(point => point.x));
  for (const metric of ['count', 'share'] as const) {
    await expect(selected(page, metric, 'a')).toHaveAttribute('data-round', '2'); await expect(selected(page, metric, 'b')).toHaveAttribute('data-round', '2');
  }
  await expect(page.locator('#micro-resistance-history-count-value')).toContainText(/A.*8.*B.*4/);
  await expect(page.locator('#micro-resistance-history-share-value')).toContainText(/A.*14%.*B.*100%/);
  await open(page.locator('#micro-resistance-history-data'));
  const table = page.locator('#micro-resistance-history-table'); await expect(table.locator('thead th')).toHaveCount(5);
  await expect(table.locator('tbody tr')).toHaveCount(3);
  await expect(table.locator('tr[data-round="0"] td')).toHaveText(['8', '8', '10%', '10%']);
  await expect(table.locator('tr[data-round="1"] td')).toHaveText(['8', '6', '12%', '75%']);
  await expect(table.locator('tr[data-round="2"] td')).toHaveText(['8', '4', '14%', '100%']);
  await round(page).selectOption('1');
  await assertGeometry(page, 'count', [8, 8, 8], [8, 6, 4], 1); await assertGeometry(page, 'share', [10, 12, 14], [10, 75, 100], 1);
  await expect(page.locator('[data-resistance-history-readout="count"]')).toHaveAttribute('data-round', '1');
  await expect(page.locator('[data-resistance-history-readout="share"]')).toHaveAttribute('data-round', '1');
  await expect(page.locator('#micro-resistance-history-share-value')).toContainText(/A.*12%.*B.*75%/);
  expect(await state(page)).toEqual(withRound(before, 1)); expect(await counters(page)).toEqual({ xp: [], random: 0 });
  await panel(page).screenshot({ path: path.join(out, 'resistance-visual-divergence-desktop.png') });
});

test('shows a real zero count at extinction while omitting the undefined share and every unobserved tail', async ({ page }) => {
  const data = seed(); data.resistanceComparison.bId = 9; await mount(page, data); const before = await state(page);
  await expect(chart(page, 'count')).toHaveAttribute('data-last-round', '1'); await expect(chart(page, 'share')).toHaveAttribute('data-last-round', '1');
  await expect(marker(page, 'count', 'a')).toHaveCount(2); await expect(marker(page, 'count', 'b')).toHaveCount(2);
  await expect(marker(page, 'share', 'a')).toHaveCount(2); await expect(marker(page, 'share', 'b')).toHaveCount(1);
  await expect(plot(page, 'count').locator('[data-resistance-history-marker="b"][data-round="1"]')).toHaveAttribute('data-value', '0');
  await expect(plot(page, 'share').locator('[data-resistance-history-marker="b"][data-round="1"]')).toHaveCount(0);
  await expect(selected(page, 'count', 'b')).toHaveAttribute('data-value', '0'); await expect(selected(page, 'share', 'b')).toHaveCount(0);
  await expect(page.locator('#micro-resistance-history-share-value')).toContainText('Undefined');
  const bSharePath = await chart(page, 'share').locator('[data-resistance-series="b"]').getAttribute('d');
  expect(bSharePath || '').not.toMatch(/[LlHhVvCcSsQqTtAa]/);
  for (const metric of ['count', 'share'] as const) {
    const values = await marker(page, metric, 'a').evaluateAll(points => points.map(point => Number(point.getAttribute('data-round')))); expect(values).toEqual([0, 1]);
    await expect(plot(page, metric).locator('[data-round="2"], [data-round="3"]')).toHaveCount(0);
  }
  await assertGeometry(page, 'count', [8, 8], [0, 0], 1); await assertGeometry(page, 'share', [10, 12], [0, null], 1);
  await open(page.locator('#micro-resistance-history-data'));
  await expect(page.locator('#micro-resistance-history-table tbody tr')).toHaveCount(2);
  await expect(page.locator('#micro-resistance-history-table tr[data-round="1"] td')).toHaveText(['8', '0', '12%', 'Undefined']);
  await panel(page).screenshot({ path: path.join(out, 'resistance-visual-extinction.png') });
  await round(page).selectOption('0'); await expect(selected(page, 'share', 'b')).toHaveAttribute('data-value', '0');
  await assertGeometry(page, 'count', [8, 8], [0, 0], 0); await assertGeometry(page, 'share', [10, 12], [0, null], 0);
  await expect(page.locator('#micro-resistance-history-share-value')).toContainText(/A.*10%.*B.*0%/);
  expect(await state(page)).toEqual(withRound(before, 0)); expect(await counters(page)).toEqual({ xp: [], random: 0 });
});

test('keyboard round changes update both plots, restore after JSON reload and agree with the comparison downloads', async ({ page }) => {
  await mount(page); await round(page).focus(); await round(page).press('Home'); await round(page).press('ArrowDown');
  await expect(round(page)).toHaveValue('0'); await expect(round(page)).toBeFocused();
  await round(page).press('ArrowDown'); await expect(round(page)).toHaveValue('1');
  for (const metric of ['count', 'share'] as const) await expect(selected(page, metric, 'a')).toHaveAttribute('data-round', '1');
  await expect(page.locator('#micro-resistance-history-selected-round')).toContainText('1');
  const saved = clone(await state(page)); await harness.unmount(page); await page.evaluate(value => (window as any).__mount(value), saved);
  await open(panel(page)); await instrument(page); await expect(round(page)).toHaveValue('1'); expect(await state(page)).toEqual(saved);
  for (const metric of ['count', 'share'] as const) await expect(selected(page, metric, 'b')).toHaveAttribute('data-round', '1');
  const text = await download(page, 'text', 'resistance-visual-selected-round.txt');
  expect(text.filename).toBe('micro-lab-resistance-comparison-A7-B4-round1.txt');
  expect(text.text).toContain('Shared comparison round: 1'); expect(text.text).toContain('Resistant cells\t8\t6\t-2');
  expect(text.text).toContain('Resistant share\t12%\t75%\t+63 percentage points');
  const csv = await download(page, 'csv', 'resistance-visual-selected-round.csv');
  expect(csv.filename).toBe('micro-lab-resistance-comparison-A7-B4-round1.csv'); expect(csv.text).toContain('"shared_round"');
  const latest = page.locator('#micro-resistance-comparison-latest'); await latest.focus(); await latest.press('Enter');
  await expect(round(page)).toHaveValue(''); await expect(latest).toBeFocused();
  for (const metric of ['count', 'share'] as const) await expect(selected(page, metric, 'a')).toHaveAttribute('data-round', '2');
  expect(await state(page)).toEqual(withRound(saved, null)); expect(await counters(page)).toEqual({ xp: [], random: 0 });
  writeFileSync(path.join(out, 'resistance-visual-restored-state.json'), JSON.stringify(saved, null, 2) + '\n');
});

test('opening and inspecting charts preserves raw imports without random draws or XP while live playback keeps its own culture', async ({ page }) => {
  const data = seed(); data.resistanceNotebook.records.splice(1, 0, null, { id: 88, evidence: 'Malformed evidence stays raw.', imported: literal });
  await mount(page, data); const before = await state(page); await open(page.locator('#micro-resistance-history-data'));
  await round(page).selectOption('0'); await round(page).selectOption('1'); await round(page).selectOption('');
  expect(await state(page)).toEqual(before); expect(await counters(page)).toEqual({ xp: [], random: 0 });
  expect((await state(page)).microbiology.resistanceNotebook.records[0].reviewNote).toBe(longNote);
  expect(await page.evaluate(() => Boolean((window as any).__visualInjected))).toBe(false);
  await expect(page.locator('[data-microbiology-tool] img[src="x"]')).toHaveCount(0); await harness.unmount(page);
  const live = seed(); live.resistanceInvestigation.history = [{ day: 0, sensitive: 72, resistant: 8 }];
  live.resistanceInvestigation.runAwarded = false; live.resistanceInvestigation.duration = 30;
  await mount(page, live); const savedBook = clone((await state(page)).microbiology.resistanceNotebook);
  const paths = await page.locator('[data-resistance-series]').evaluateAll(nodes => nodes.map(node => node.getAttribute('d')));
  await page.getByRole('button', { name: '▶ Play', exact: true }).click();
  await round(page).selectOption('0'); await expect(round(page)).toHaveValue('0');
  await expect.poll(async () => (await state(page)).microbiology.resistanceInvestigation.day).toBeGreaterThan(0);
  await page.getByRole('button', { name: '⏸ Pause', exact: true }).click();
  const paused = await state(page), draws = await counters(page);
  expect(paused.microbiology.resistanceNotebook).toEqual(savedBook);
  expect(paused.microbiology.resistanceInvestigation.notes).toBe('Independent current culture notes.');
  expect(paused.microbiology.resistanceInvestigation.history.every((point: any) => point.sensitive === 72 && point.resistant === 8)).toBe(true);
  expect(draws.random).toBeGreaterThan(0); expect(draws.xp).toEqual([]);
  expect(await page.locator('[data-resistance-series]').evaluateAll(nodes => nodes.map(node => node.getAttribute('d')))).toEqual(paths);
  await round(page).selectOption('1'); await open(page.locator('#micro-resistance-history-data'));
  expect(await counters(page)).toEqual(draws); expect(await state(page)).toEqual(withRound(paused, 1));
});

test('plots keep readable HTML axes and selected values at 320 pixels and 400 percent zoom', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await mount(page); await open(page.locator('#micro-resistance-history-data')); const before = await state(page);
  expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
  await page.setViewportSize({ width: 320, height: 844 }); await round(page).selectOption('1'); await noOverflow(page);
  for (const metric of ['count', 'share'] as const) {
    const readout = page.locator('[data-resistance-history-readout="' + metric + '"]'); await expect(readout).toBeVisible();
    expect(await readout.evaluate(node => parseFloat(getComputedStyle(node).fontSize))).toBeGreaterThanOrEqual(12);
    const svg = chart(page, metric); await expect(svg).toBeVisible(); await expect(svg.locator('text')).toHaveCount(0);
    const box = await svg.boundingBox(); expect(box!.width).toBeGreaterThan(120); expect(box!.height).toBeGreaterThanOrEqual(180);
  }
  await assertGeometry(page, 'count', [8, 8, 8], [8, 6, 4], 1); await assertGeometry(page, 'share', [10, 12, 14], [10, 75, 100], 1);
  await assertHistoryTableKeyboardScroll(page);
  await panel(page).screenshot({ path: path.join(out, 'resistance-visuals-phone-320.png') });
  await page.setViewportSize({ width: 1280, height: 960 }); await page.evaluate(() => { document.body.style.zoom = '4'; });
  await round(page).focus(); await round(page).press('Home'); await round(page).press('ArrowDown');
  await expect(round(page)).toHaveValue('0'); await expect(round(page)).toBeFocused(); await noOverflow(page);
  await expect(page.locator('#micro-resistance-history-count-value')).toContainText(/A.*8.*B.*8/);
  await expect(page.locator('#micro-resistance-history-share-value')).toContainText(/A.*10%.*B.*10%/);
  for (const metric of ['count', 'share'] as const) await expect(page.locator('[data-resistance-history-readout="' + metric + '"]')).toBeVisible();
  await assertGeometry(page, 'count', [8, 8, 8], [8, 6, 4], 0); await assertGeometry(page, 'share', [10, 12, 14], [10, 75, 100], 0);
  await assertHistoryTableKeyboardScroll(page);
  await panel(page).screenshot({ path: path.join(out, 'resistance-visuals-400-percent.png') });
  expect(await state(page)).toEqual(withRound(before, 0)); expect(await counters(page)).toEqual({ xp: [], random: 0 });
});

test('long saved histories retain observed numeric geometry, sparse readable ticks and both coincident round-zero series', async ({ page }) => {
  const data = seed();
  const historyA = Array.from({ length: 31 }, (_, day) => ({ day, sensitive: 72 - day, resistant: 8 + Math.floor(day / 3) }));
  const historyB = Array.from({ length: 31 }, (_, day) => ({ day, sensitive: 72 - 2 * day, resistant: 8 }));
  data.resistanceNotebook.records[0].evidence = { ...data.resistanceNotebook.records[0].evidence, duration: 30, history: historyA };
  data.resistanceNotebook.records[1].evidence = { ...data.resistanceNotebook.records[1].evidence, duration: 30, history: historyB };
  await mount(page, data); const before = clone(await state(page));
  const countsA = historyA.map(point => point.resistant), countsB = historyB.map(point => point.resistant);
  const sharesA = historyA.map(point => Math.round(point.resistant / (point.sensitive + point.resistant) * 100));
  const sharesB = historyB.map(point => Math.round(point.resistant / (point.sensitive + point.resistant) * 100));
  await assertGeometry(page, 'count', countsA, countsB, 30); await assertGeometry(page, 'share', sharesA, sharesB, 30);
  await page.locator('#micro-resistance-history').screenshot({ path: path.join(out, 'resistance-history-long-desktop.png') });
  await page.setViewportSize({ width: 320, height: 844 }); await round(page).selectOption('0'); await noOverflow(page);
  await assertGeometry(page, 'count', countsA, countsB, 0); await assertGeometry(page, 'share', sharesA, sharesB, 0);
  for (const metric of ['count', 'share'] as const) {
    const model = await geometry(chart(page, metric)), a = model.selected.find(point => point.selected === 'a')!, b = model.selected.find(point => point.selected === 'b')!;
    expect(a.x).toBeCloseTo(b.x, 4); expect(a.y).toBeCloseTo(b.y, 4);
    expect(a.paintedWidth - b.paintedWidth).toBeGreaterThan(5); expect(a.radius).toBe('50%'); expect(b.radius).toBe('0px');
    const ticks = await page.locator('#micro-resistance-history-' + metric + '-axes [data-resistance-history-x-label]').evaluateAll(labels => labels.map(label => {
      const box = label.getBoundingClientRect(); return { left: box.left, right: box.right };
    }));
    for (let i = 1; i < ticks.length; i++) expect(ticks[i].left - ticks[i - 1].right).toBeGreaterThanOrEqual(2);
  }
  await page.locator('#micro-resistance-history').screenshot({ path: path.join(out, 'resistance-history-long-phone-320.png') });
  await round(page).focus(); await round(page).press('End'); await expect(round(page)).toHaveValue('30'); await expect(round(page)).toBeFocused();
  await assertGeometry(page, 'count', countsA, countsB, 30); await assertGeometry(page, 'share', sharesA, sharesB, 30);
  expect(await state(page)).toEqual(withRound(before, 30)); expect(await counters(page)).toEqual({ xp: [], random: 0 });
});

test('forced-colour dark and light canvases keep both histories, guides and fixed-size point shapes visible through keyboard inspection', async ({ page }) => {
  await mount(page); const before = clone(await state(page));
  await page.evaluate(() => document.body.classList.add('theme-contrast'));
  for (const colorScheme of ['dark', 'light'] as const) {
    await page.emulateMedia({ forcedColors: 'active', colorScheme, reducedMotion: 'reduce' });
    expect(await page.evaluate(() => matchMedia('(forced-colors: active)').matches)).toBe(true);
    expect(await page.evaluate(scheme => matchMedia('(prefers-color-scheme: ' + scheme + ')').matches, colorScheme)).toBe(true);
    await noOverflow(page); await assertForcedColourContrast(page);
    await round(page).focus(); await round(page).press('Home'); await round(page).press('ArrowDown');
    await expect(round(page)).toHaveValue('0'); await expect(round(page)).toBeFocused();
    await assertGeometry(page, 'count', [8, 8, 8], [8, 6, 4], 0); await assertGeometry(page, 'share', [10, 12, 14], [10, 75, 100], 0);
    await assertForcedColourContrast(page);
    await page.locator('#micro-resistance-history').screenshot({ path: path.join(out, 'resistance-history-forced-' + colorScheme + '.png') });
    await round(page).selectOption('1'); await assertGeometry(page, 'count', [8, 8, 8], [8, 6, 4], 1); await assertGeometry(page, 'share', [10, 12, 14], [10, 75, 100], 1);
    await assertForcedColourContrast(page);
  }
  expect(await state(page)).toEqual(withRound(before, 1)); expect(await counters(page)).toEqual({ xp: [], random: 0 });
});

test('missing, duplicate or malformed snapshot choices show no invented history plots or selected points', async ({ page }) => {
  const choices = [
    { aId: 7, bId: null, round: 1 }, { aId: 7, bId: 7, round: 1 },
    { aId: 99, bId: 4, round: 1 }, { aId: 'broken', bId: 4, round: 1 }
  ];
  for (const pair of choices) {
    const data = seed(); data.resistanceComparison = { ...data.resistanceComparison, ...pair };
    await mount(page, data); const before = await state(page);
    await expect(chart(page, 'count')).toHaveCount(0); await expect(chart(page, 'share')).toHaveCount(0);
    await expect(page.locator('[data-resistance-selected-marker]')).toHaveCount(0);
    await expect(page.locator('#micro-resistance-history-table')).toHaveCount(0); await expect(round(page)).toHaveCount(0);
    await expect(page.locator('#micro-resistance-comparison-unavailable')).toBeVisible();
    await expect(page.locator('#micro-resistance-comparison-download-text')).toBeDisabled();
    expect(await state(page)).toEqual(before); expect(await counters(page)).toEqual({ xp: [], random: 0 }); await harness.unmount(page);
  }
});
