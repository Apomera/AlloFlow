import { test, expect, type Locator, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

test.use({ video: 'off' });
test.describe.configure({ retries: 0, timeout: 150000 });
const out = path.resolve(process.env.MICROBIOLOGY_REPORT_DIR || 'reports/micro-lab-resistance-dashboard-2026-10-04');
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_microbiology.js', toolId: 'microbiology', width: 1280, height: 960, layout: 'document' });
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const state = (page: Page) => page.evaluate(() => (window as any).__toolData);
const dish = (page: Page) => page.locator('#micro-resistance-dish');
const trend = (page: Page) => page.locator('[data-resistance-trend] svg');
const comparison = (page: Page) => page.locator('#micro-resistance-comparison');
const playback = (page: Page) => page.locator('#micro-resistance-playback');
const selection = (page: Page) => page.getByLabel('Shared comparison round', { exact: true });
const literal = '<img src=x onerror="window.__liveVisualInjected=true"> Keep imported evidence literal.';
const originalNote = 'Keep the original uncertainty and observations. '.repeat(20);
let errors: string[];

const partial = { dose: 60, duration: 8, initRes: 10, prediction: 'increase', notes: 'Current culture notes.',
  history: [{ day: 0, sensitive: 72, resistant: 8 }, { day: 1, sensitive: 60, resistant: 6 }, { day: 2, sensitive: 20, resistant: 3 }],
  runAwarded: true, explanationAwarded: false };
const snapshotB = { ...clone(partial), dose: 90, notes: literal,
  history: [{ day: 0, sensitive: 72, resistant: 8 }, { day: 1, sensitive: 2, resistant: 6 }, { day: 2, sensitive: 0, resistant: 4 }] };
function seed() {
  return { tab: 'resistance', showMicroLibrary: false, earnedXP: 53, resistanceInvestigation: clone(partial),
    resistanceNotebook: { records: [
      { id: 7, evidence: clone(partial), reviewNote: originalNote, importedRecord: { literal, keep: [1, 2] } },
      { id: 4, evidence: clone(snapshotB), reviewNote: literal }
    ], selectedId: 7, nextId: 40, importedNotebook: { literal }, removed: { record: { id: 30, evidence: clone(snapshotB), reviewNote: originalNote }, index: 1, importedRecovery: true } },
    resistanceComparison: { aId: 7, bId: 4, round: null, rawPreference: { literal } },
    growthLab: { profile: 'ecoli', tempC: 18, pH: 7, oxygen: 100, hypothesis: 'Keep the Growth hypothesis.' },
    metadata: { literal, keep: true } };
}
async function open(details: Locator) {
  if (!await details.evaluate(node => (node as HTMLDetailsElement).open)) {
    await details.locator(':scope > summary').focus(); await details.locator(':scope > summary').press('Enter');
  }
  await expect(details).toHaveAttribute('open', '');
}
async function mount(page: Page, data = seed()) {
  await page.setViewportSize({ width: 1280, height: 960 });
  await harness.mount(page, { unrelatedTool: { note: literal, keep: [1, 2, 3] }, microbiology: data }, undefined, { expectCanvas: false });
  await page.addStyleTag({ content: '#wrap{width:100%!important}body{margin:0;font-family:system-ui,sans-serif}button,input,select,textarea{font-family:inherit}' });
  await expect.poll(async () => (await state(page)).microbiology.resistanceInvestigation.day).toBe(data.resistanceInvestigation.history.length - 1);
  await page.evaluate(() => {
    const w = window as any; w.__liveVisualXP = []; w.__liveVisualRandom = 0;
    w.__ctx.awardXP = (...args: any[]) => w.__liveVisualXP.push(args);
    if (!w.__liveVisualOriginalRandom) {
      w.__liveVisualOriginalRandom = Math.random;
      Math.random = () => { w.__liveVisualRandom++; return w.__liveVisualOriginalRandom(); };
    }
    w.__rerender();
  });
  await expect(dish(page)).toBeVisible(); await expect(playback(page)).toBeVisible();
}
const counters = (page: Page) => page.evaluate(() => ({ xp: (window as any).__liveVisualXP, random: (window as any).__liveVisualRandom }));
const savedPaths = (page: Page) => page.locator('[data-resistance-series]').evaluateAll(nodes => nodes.map(node => node.getAttribute('d')));
async function assertPopulation(page: Page, sensitive: number, resistant: number) {
  const counts = { sensitive, resistant, unoccupied: 80 - sensitive - resistant };
  await expect(dish(page).locator('[data-resistance-cell]')).toHaveCount(80);
  const widths: Record<string, number> = {};
  for (const [kind, count] of Object.entries(counts)) {
    await expect(dish(page).locator('[data-resistance-cell="' + kind + '"]')).toHaveCount(count);
    const readout = page.locator('[data-resistance-population="' + kind + '"]');
    await expect(readout).toHaveText(String(count));
    const segment = page.locator('[data-resistance-capacity="' + kind + '"]');
    await expect(segment).toHaveAttribute('data-count', String(count));
    widths[kind] = (await segment.boundingBox())!.width;
  }
  const totalWidth = Object.values(widths).reduce((sum, width) => sum + width, 0);
  expect(totalWidth).toBeGreaterThan(100);
  for (const [kind, count] of Object.entries(counts)) expect(widths[kind] / totalWidth).toBeCloseTo(count / 80, 2);
  const population = page.locator('#micro-resistance-population');
  await expect(population).toHaveJSProperty('tagName', 'SECTION');
  await expect(population).toHaveAttribute('aria-labelledby', 'micro-resistance-population-title');
  await expect(population.locator('dl')).toHaveCount(1);
  await expect(population.locator('dt')).toHaveText(['Sensitive', 'Resistant', 'Unoccupied']);
  await expect(page.locator('#micro-resistance-capacity')).toHaveAttribute('aria-hidden', 'true');
  await expect(dish(page).locator('[data-resistance-cell="sensitive"]:not(circle)')).toHaveCount(0);
  const diamonds = await dish(page).locator('[data-resistance-cell="resistant"]').evaluateAll(nodes => nodes.map(node => {
    const box = (node as SVGGraphicsElement).getBBox();
    return { tag: node.tagName.toLowerCase(), width: box.width, height: box.height, transform: node.getAttribute('transform') };
  }));
  for (const diamond of diamonds) {
    expect(diamond.tag).toBe('rect'); expect(diamond.width).toBeGreaterThan(0);
    expect(diamond.height).toBeCloseTo(diamond.width, 8);
    expect(diamond.transform).toMatch(/^rotate\(\s*45[\s,)]/);
  }
  await expect(dish(page).locator('[data-resistance-cell="unoccupied"]:not(circle[fill="none"])')).toHaveCount(0);
}
async function trendGeometry(page: Page) {
  return trend(page).evaluate(node => {
    const svg = node as SVGSVGElement;
    return {
      grids: [...svg.querySelectorAll('[data-resistance-trend-level]')].map(line => ({
        value: Number(line.getAttribute('data-resistance-trend-level')), x1: Number(line.getAttribute('x1')),
        x2: Number(line.getAttribute('x2')), y1: Number(line.getAttribute('y1')), y2: Number(line.getAttribute('y2'))
      })),
      observations: [...svg.querySelectorAll('[data-resistance-observation]')].map(point => {
        const box = (point as SVGGraphicsElement).getBBox();
        return { day: Number(point.getAttribute('data-resistance-observation')), value: Number(point.getAttribute('data-value')),
          x: box.x + box.width / 2, y: box.y + box.height / 2, tag: point.tagName.toLowerCase() };
      }),
      path: svg.querySelector('polyline')?.getAttribute('points') || '',
      circles: [...svg.querySelectorAll('circle')].map(circle => ({ x: Number(circle.getAttribute('cx')), y: Number(circle.getAttribute('cy')) }))
    };
  });
}
async function assertTrend(page: Page, history: { day: number; sensitive: number; resistant: number }[], duration: number) {
  const geometry = await trendGeometry(page);
  expect(geometry.grids.map(grid => grid.value).sort((a, b) => a - b)).toEqual([0, 25, 50, 75, 100]);
  const bottom = geometry.grids.find(grid => grid.value === 0)!, top = geometry.grids.find(grid => grid.value === 100)!;
  expect(bottom.y1).toBeGreaterThan(top.y1); expect(bottom.x2).toBeGreaterThan(bottom.x1);
  for (const grid of geometry.grids) {
    expect(grid.x1).toBeCloseTo(bottom.x1, 5); expect(grid.x2).toBeCloseTo(bottom.x2, 5);
    expect(grid.y1).toBeCloseTo(bottom.y1 - grid.value / 100 * (bottom.y1 - top.y1), 5); expect(grid.y2).toBeCloseTo(grid.y1, 5);
  }
  const living = history.filter(point => point.sensitive + point.resistant > 0);
  expect(geometry.observations.map(point => point.day)).toEqual(living.map(point => point.day));
  for (const [index, point] of geometry.observations.entries()) {
    const value = living[index].resistant / (living[index].sensitive + living[index].resistant) * 100;
    expect(point.tag).toBe('polygon'); expect(point.value).toBeCloseTo(value, 8);
    expect(point.x).toBeCloseTo(bottom.x1 + living[index].day / duration * (bottom.x2 - bottom.x1), 3);
    expect(point.y).toBeCloseTo(bottom.y1 - value / 100 * (bottom.y1 - top.y1), 3);
  }
  if (geometry.path) {
    const coordinates = geometry.path.trim().split(/\s+/).map(pair => pair.split(',').map(Number));
    expect(coordinates.every(pair => pair.length === 2 && pair.every(Number.isFinite))).toBe(true);
    expect(coordinates).toHaveLength(geometry.observations.length);
    coordinates.forEach((pair, index) => { expect(pair[0]).toBeCloseTo(geometry.observations[index].x, 3); expect(pair[1]).toBeCloseTo(geometry.observations[index].y, 3); });
    expect(Math.max(...coordinates.map(pair => pair[0]))).toBeLessThan(bottom.x2);
  }
  const current = history[history.length - 1], total = current.sensitive + current.resistant;
  expect(geometry.circles).toHaveLength(total ? 1 : 0);
  if (total) {
    const point = geometry.circles[0];
    expect(point.x).toBeCloseTo(bottom.x1 + current.day / duration * (bottom.x2 - bottom.x1), 3);
    expect(point.y).toBeCloseTo(bottom.y1 - Math.round(current.resistant / total * 100) / 100 * (bottom.y1 - top.y1), 3);
  }
  await expect(trend(page)).toHaveAttribute('role', 'img');
  await expect(trend(page)).toHaveAttribute('aria-label', /^Resistance trend/);
  await expect(trend(page).locator('text')).toHaveCount(0);
  const renderedTicks = await page.locator('[data-resistance-trend]').evaluate(element => {
    const labels = [...element.querySelector('div')!.querySelectorAll('span')];
    return labels.map(label => {
      const value = parseInt(label.textContent!, 10), box = label.getBoundingClientRect();
      const line = element.querySelector('[data-resistance-trend-level="' + value + '"]')!.getBoundingClientRect();
      return { value, labelY: box.y + box.height / 2, lineY: line.y + line.height / 2 };
    });
  });
  expect(renderedTicks.map(tick => tick.value)).toEqual([100, 75, 50, 25, 0]);
  for (const tick of renderedTicks) expect(Math.abs(tick.labelY - tick.lineY)).toBeLessThan(1);
  return geometry;
}
async function assertLayout(page: Page) {
  const viewport = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
  expect(viewport.scroll <= viewport.width + 1, JSON.stringify(viewport)).toBe(true);
  for (const node of [dish(page), page.locator('#micro-resistance-population'), page.locator('#micro-resistance-capacity'),
    page.locator('[data-resistance-trend]'), page.locator('#micro-resistance-live-readout'), playback(page)]) {
    await expect(node).toBeVisible();
    const layout = await node.evaluate(element => ({ id: element.id, client: element.clientWidth, scroll: element.scrollWidth }));
    expect(layout.scroll <= layout.client + 1, JSON.stringify(layout)).toBe(true);
  }
  for (const node of [page.locator('#micro-resistance-live-readout'), page.locator('[data-resistance-population="resistant"]')]) {
    expect(await node.evaluate(element => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(12);
  }
  const order = await playback(page).evaluate(element => {
    const prediction = document.querySelector('#micro-resistance-prediction')!, chart = document.querySelector('[data-resistance-trend]')!;
    return { beforePrediction: Boolean(element.compareDocumentPosition(prediction) & Node.DOCUMENT_POSITION_FOLLOWING),
      afterTrend: Boolean(element.compareDocumentPosition(chart) & Node.DOCUMENT_POSITION_PRECEDING),
      gap: (element.getBoundingClientRect().top - chart.getBoundingClientRect().bottom) / (parseFloat(getComputedStyle(document.body).zoom) || 1) };
  });
  expect(order.beforePrediction).toBe(true); expect(order.afterTrend).toBe(true);
  expect(order.gap).toBeGreaterThanOrEqual(-1); expect(order.gap).toBeLessThan(320);
  for (const button of [playback(page).getByRole('button', { name: '▶ Play', exact: true }), playback(page).getByRole('button', { name: 'Step round', exact: true })]) {
    await button.focus(); await expect(button).toBeFocused();
    const style = await button.evaluate(element => ({ outline: getComputedStyle(element).outlineStyle, width: parseFloat(getComputedStyle(element).outlineWidth) }));
    expect(style.outline).not.toBe('none'); expect(style.width).toBeGreaterThan(0);
  }
}

test.beforeAll(async () => { mkdirSync(out, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.beforeEach(async ({ page }) => { errors = []; page.on('pageerror', error => errors.push(error.message)); });
test.afterEach(async ({ page }) => { try { expect(errors).toEqual([]); } finally { await harness.unmount(page); } });

test('restored live dish, numeric population and fixed-capacity segments agree without modifying saved or imported evidence', async ({ page }) => {
  await mount(page); const before = clone(await state(page)); await assertPopulation(page, 20, 3);
  await expect(page.locator('#micro-resistance-live-readout')).toContainText(/2.*13%/);
  await expect(dish(page)).toHaveAttribute('role', 'img');
  await expect(dish(page)).toHaveAccessibleName(/^Petri dish/);
  const description = [await dish(page).getAttribute('aria-labelledby'), await dish(page).getAttribute('aria-describedby')].filter(Boolean).join(' ').trim();
  for (const id of description ? description.split(/\s+/) : []) { await expect(page.locator('[id="' + id + '"]')).toHaveCount(1); expect(await page.locator('[id="' + id + '"]').textContent()).toBeTruthy(); }
  await open(comparison(page)); await open(page.locator('#micro-resistance-history-data'));
  expect(await state(page)).toEqual(before); expect(await counters(page)).toEqual({ xp: [], random: 0 });
  expect(before.microbiology.resistanceNotebook.records[0].reviewNote).toBe(originalNote);
  expect(await page.evaluate(() => Boolean((window as any).__liveVisualInjected))).toBe(false);
  await expect(page.locator('[data-microbiology-tool] img[src="x"]')).toHaveCount(0);
  await page.locator('#micro-resistance-dashboard').screenshot({ path: path.join(out, 'resistance-dashboard-desktop.png') });
});

test('live observations use raw share geometry on fixed percent and planned-round axes while extinction omits an undefined endpoint', async ({ page }) => {
  await mount(page); const before = clone(await state(page));
  await assertTrend(page, partial.history, 8);
  expect(await state(page)).toEqual(before); expect(await counters(page)).toEqual({ xp: [], random: 0 });
  await harness.unmount(page);
  const data = seed(); data.resistanceInvestigation = { ...clone(partial), dose: 100, prediction: 'extinct',
    history: [{ day: 0, sensitive: 72, resistant: 8 }, { day: 1, sensitive: 0, resistant: 0 }] };
  await mount(page, data); const extinctBefore = clone(await state(page));
  await assertPopulation(page, 0, 0); const geometry = await assertTrend(page, data.resistanceInvestigation.history, 8);
  expect(geometry.observations.map(point => point.day)).toEqual([0]);
  await expect(trend(page).locator('[data-resistance-observation="1"]')).toHaveCount(0);
  await expect(page.locator('#micro-resistance-live-readout')).toContainText(/1.*Undefined/i);
  await expect(playback(page).getByRole('button', { name: 'Step round', exact: true })).toBeDisabled();
  expect(await state(page)).toEqual(extinctBefore); expect(await counters(page)).toEqual({ xp: [], random: 0 });
  await page.locator('#micro-resistance-dashboard').screenshot({ path: path.join(out, 'resistance-dashboard-extinction.png') });
});

test('keyboard step and play-pause update real live counts and visuals while the saved notebook and comparison histories remain fixed', async ({ page }) => {
  const data = seed(); data.resistanceInvestigation = { ...clone(partial), dose: 0, duration: 30, runAwarded: false,
    history: [{ day: 0, sensitive: 72, resistant: 8 }] };
  await mount(page, data); await open(comparison(page));
  const before = clone(await state(page)), paths = await savedPaths(page);
  const step = playback(page).getByRole('button', { name: 'Step round', exact: true }); await step.focus(); await step.press('Enter');
  await expect.poll(async () => (await state(page)).microbiology.resistanceInvestigation.day).toBe(1); await expect(step).toBeFocused();
  await assertPopulation(page, 72, 8); await expect(page.locator('#micro-resistance-live-readout')).toContainText(/1.*10%/);
  const play = playback(page).getByRole('button', { name: '▶ Play', exact: true }); await play.focus(); await play.press('Enter');
  await expect.poll(async () => (await state(page)).microbiology.resistanceInvestigation.day).toBeGreaterThan(1);
  const pause = playback(page).getByRole('button', { name: '⏸ Pause', exact: true }); await pause.focus(); await pause.press('Enter');
  const paused = clone(await state(page)), draws = await counters(page), run = paused.microbiology.resistanceInvestigation;
  expect(draws.random).toBeGreaterThan(0); expect(draws.xp).toEqual([]);
  expect(run.history.every((point: any) => point.sensitive === 72 && point.resistant === 8)).toBe(true);
  await assertPopulation(page, 72, 8); await assertTrend(page, run.history, 30);
  await expect(page.locator('#micro-resistance-live-readout')).toContainText(new RegExp(run.day + '.*10%'));
  expect(paused.microbiology.resistanceNotebook).toEqual(before.microbiology.resistanceNotebook);
  expect(paused.microbiology.metadata).toEqual(before.microbiology.metadata); expect(paused.unrelatedTool).toEqual(before.unrelatedTool);
  expect(await savedPaths(page)).toEqual(paths);
  await selection(page).selectOption('1'); await open(page.locator('#micro-resistance-history-data'));
  expect(await counters(page)).toEqual(draws);
  const expected = clone(paused); expected.microbiology.resistanceComparison.round = 1; expect(await state(page)).toEqual(expected);
  writeFileSync(path.join(out, 'resistance-dashboard-paused-state.json'), JSON.stringify(paused, null, 2) + '\n');
});

test('phone and 400 percent layouts retain distinct cell shapes, readable counts and nearby keyboard controls with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await mount(page); const before = clone(await state(page));
  expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
  await page.setViewportSize({ width: 320, height: 844 }); await assertLayout(page); await assertPopulation(page, 20, 3);
  await assertTrend(page, partial.history, 8);
  const countsWidth = (await page.locator('.micro-resistance-population-counts').boundingBox())!.width;
  expect((await page.locator('[data-resistance-count-card="unoccupied"]').boundingBox())!.width).toBeCloseTo(countsWidth, 0);
  expect((await dish(page).boundingBox())!.width).toBeGreaterThanOrEqual(200);
  await page.locator('#micro-resistance-dashboard').screenshot({ path: path.join(out, 'resistance-dashboard-phone-320.png') });
  await page.setViewportSize({ width: 1280, height: 960 }); await page.evaluate(() => { document.body.style.zoom = '4'; });
  await assertLayout(page); await assertPopulation(page, 20, 3); await assertTrend(page, partial.history, 8);
  await expect(page.locator('#micro-resistance-live-readout')).toContainText(/2.*13%/);
  await page.locator('#micro-resistance-dashboard').screenshot({ path: path.join(out, 'resistance-dashboard-400-percent.png') });
  expect(await state(page)).toEqual(before); expect(await counters(page)).toEqual({ xp: [], random: 0 });
});

test('selected saved-history row has a visible border and weight that follow both chart guides without altering live population', async ({ page }) => {
  await mount(page); await open(comparison(page)); await open(page.locator('#micro-resistance-history-data')); const before = clone(await state(page));
  for (const selectedRound of [0, 1, 2]) {
    await selection(page).selectOption(String(selectedRound));
    const row = page.locator('#micro-resistance-history-table tbody tr[data-round="' + selectedRound + '"]');
    await expect(page.locator('#micro-resistance-history-table tbody tr[aria-current="true"]')).toHaveCount(1); await expect(row).toHaveAttribute('aria-current', 'true');
    const emphasis = await row.evaluate(element => {
      const cell = element.querySelector('th[scope="row"]')!;
      return { border: parseFloat(getComputedStyle(cell).borderLeftWidth), style: getComputedStyle(cell).borderLeftStyle,
        weight: parseInt(getComputedStyle(element).fontWeight, 10) };
    });
    expect(emphasis.border).toBeGreaterThanOrEqual(3); expect(emphasis.style).not.toBe('none'); expect(emphasis.weight).toBeGreaterThanOrEqual(600);
    for (const metric of ['count', 'share']) {
      const svg = page.locator('#micro-resistance-history-' + metric), guide = svg.locator('[data-resistance-history-guide]');
      await expect(guide).toHaveAttribute('data-resistance-history-guide', String(selectedRound));
      const guideX = Number(await guide.getAttribute('x1'));
      for (const series of ['a', 'b']) {
        const plot = page.locator('#micro-resistance-history-' + metric + '-plot');
        const point = plot.locator('[data-resistance-selected-marker="' + series + '"]'); await expect(point).toHaveAttribute('data-round', String(selectedRound));
        const position = await point.evaluate(element => {
          const box = element.getBoundingClientRect(), plot = document.getElementById(element.closest('[id$="-plot"]')!.id)!.getBoundingClientRect();
          return { x: box.x + box.width / 2, left: plot.x, width: plot.width, zoom: parseFloat(getComputedStyle(document.body).zoom) || 1 };
        });
        expect(Math.abs(position.x - (position.left + guideX / 100 * position.width))).toBeLessThan(position.zoom);
      }
    }
    await assertPopulation(page, 20, 3);
    const expected = clone(before); expected.microbiology.resistanceComparison.round = selectedRound; expect(await state(page)).toEqual(expected);
  }
  expect(await counters(page)).toEqual({ xp: [], random: 0 });
  await comparison(page).screenshot({ path: path.join(out, 'resistance-dashboard-selected-history.png') });
});
