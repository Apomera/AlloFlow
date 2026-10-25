import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off', trace: 'off' });
test.describe.configure({ timeout: 180000, retries: 0 });
const output = resolve(process.env.RAPTOR_DISTANCE_ROUND8_REPORT || 'reports/raptor-distance-round8-20261023');
const harness = new GlHarness({
  toolId: 'raptorHunt', toolFile: 'stem_lab/stem_tool_raptorhunt.js',
  preScripts: ['stem_lab/stem_lab_module.js'], width: 1120, height: 900,
  appStyles: true, layout: 'document',
  probes: 'window.StemLab.loadScriptResilient=window.distanceSignalNativeLoader;window.AlloPostFXEnabled=false;'
});
const ui = {
  root: '[data-raptor-distance-study]', launch: '[data-raptor-distance-launch]', close: '[data-raptor-distance-close]',
  panel: '[data-distance-signal]', summary: '[data-distance-signal] > summary', read: '[data-distance-signal-read]',
  chart: '[data-distance-signal-chart]', probe: '[data-distance-signal-probe]', error: '[data-distance-signal-error]',
  images: 'img[data-distance-signal-image]', pixel: '[data-distance-signal-pixel]', start: '[data-distance-signal-start]',
  reveal: '[data-distance-reveal]', note: '[data-distance-note]', save: '[data-distance-save]'
};
const priorRecord = {
  version: 1, modelVersion: 1, distance: 120, cycles: 12, contrast: 95, widthM: .3,
  referenceLimit: 60, eagleLimit: 140, prediction: 'eagle', note: 'An earlier observation remains in my notebook.'
};
const savedResults = { version: 1, human: { version: 1, modelVersion: 1, reference: 'human', trials: [85, 86].map((distance, i) => ({
  settings: { version: 1, distance, cycles: 12, contrast: 95, widthM: .3, wideFov: 20, detailFov: .75 }, prediction: i ? 'eagle' : 'both'
})) } };

async function setup(page: Page, initialStudy: Record<string, unknown> = {}) {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    const nativeFrame = window.requestAnimationFrame.bind(window), nativePng = HTMLCanvasElement.prototype.toDataURL;
    const nativeRead = CanvasRenderingContext2D.prototype.getImageData;
    (window as any).distanceSignalRafs = 0; (window as any).distanceSignalCaptures = 0; (window as any).distanceSignalReads = 0;
    window.requestAnimationFrame = callback => {
      if (/raptor_distance_(study|scene)\.js/.test(String(new Error().stack))) (window as any).distanceSignalRafs++;
      return nativeFrame(callback);
    };
    HTMLCanvasElement.prototype.toDataURL = function (...args: any[]) {
      if (this.hasAttribute('data-distance-canvas') && /raptor_distance_study\.js/.test(String(new Error().stack))) (window as any).distanceSignalCaptures++;
      return nativePng.apply(this, args as any);
    };
    CanvasRenderingContext2D.prototype.getImageData = function (...args: any[]) {
      if (this.canvas.hasAttribute('data-distance-canvas') && /raptor_distance_(study|signal)\.js/.test(String(new Error().stack))) (window as any).distanceSignalReads++;
      return nativeRead.apply(this, args as any);
    };
  });
  await page.route('**/stem_lab/stem_lab_module.js*', route => route.fulfill({
    contentType: 'text/javascript', body: readFileSync('stem_lab/stem_lab_module.js', 'utf8') + '\nwindow.distanceSignalNativeLoader=window.StemLab.loadScriptResilient;'
  }));
  await harness.mount(page, { raptorHunt: {
    activeSection: 'acuity', selectedSpecies: 'coopersHawk', activeMission: 'open',
    flightSession: { speciesId: 'coopersHawk', missionId: 'open' }, huntTutorialDismissed: true,
    graphicsQuality: 'low', xp: 97, huntStats: { attempts: 4, captures: 2 },
    acuity: { version: 2, distance: 18, span: 50, opacity: 75, target: 'plaque', guides: false },
    distantDetailStudy: { version: 1, distance: 80, cycles: 8, contrast: 95, records: [priorRecord], fieldworkResults: savedResults, ...initialStudy }
  } }, undefined, { expectCanvas: false });
  await expect(page.locator(ui.launch)).toBeVisible();
  expect(await harness.glContexts(page)).toEqual([]);
  return { errors, siblings: await siblings(page) };
}

async function siblings(page: Page) {
  return page.evaluate(() => { const value = { ...(window as any).__toolData.raptorHunt }; delete value.distantDetailStudy; return value; });
}

async function activate(page: Page, selector: string, keyboard = false) {
  const control = page.locator(selector);
  if (keyboard) { await control.focus(); await page.keyboard.press('Enter'); } else await control.click();
}

async function open(page: Page, keyboard = false) {
  await activate(page, ui.launch, keyboard);
  await expect(page.locator(ui.root)).toHaveAttribute('data-render-ready', 'true', { timeout: 60000 });
  await expect(page.locator(ui.panel)).not.toHaveAttribute('open', '');
  await activate(page, ui.summary, keyboard);
}

async function setRange(page: Page, selector: string, value: number) {
  await page.locator(selector).evaluate((input: HTMLInputElement, next) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, String(next));
    input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
  await expect(page.locator(selector)).toHaveValue(String(value));
}

async function reveal(page: Page, prediction = 'both', keyboard = false) {
  await activate(page, '[data-distance-prediction="' + prediction + '"]', keyboard);
  await activate(page, ui.reveal, keyboard);
  await expect(page.locator('[data-distance-result]')).toBeVisible();
}

async function work(page: Page) {
  return page.locator(ui.root).evaluate((root: any) => ({
    diagnostics: root._distanceScene.getDiagnostics(), captures: (window as any).distanceSignalCaptures,
    reads: (window as any).distanceSignalReads, rafs: (window as any).distanceSignalRafs,
    persisted: (window as any).__toolData.raptorHunt.distantDetailStudy
  }));
}

async function unchangedWork(page: Page, before: Awaited<ReturnType<typeof work>>, readDelta = 0) {
  await page.evaluate(() => new Promise<void>(done => requestAnimationFrame(() => requestAnimationFrame(() => done()))));
  const after = await work(page);
  expect(after.diagnostics.lifecycle.renderCount).toBe(before.diagnostics.lifecycle.renderCount);
  expect(after.diagnostics.lifecycle.allocationCount).toBe(before.diagnostics.lifecycle.allocationCount);
  expect(after.captures).toBe(before.captures); expect(after.reads).toBe(before.reads + readDelta); expect(after.rafs).toBe(0);
  expect(after.persisted).toEqual(before.persisted);
  expect((await harness.glContexts(page)).filter(context => !context.lost)).toHaveLength(1);
  return after;
}

async function pixels(page: Page) {
  return page.locator(ui.root).evaluate((root: any) => {
    const distance = Number((root.querySelector('#rh-distance-distance') as HTMLInputElement).value);
    const width = 1024 * .30 / (2 * distance * Math.tan(.75 * Math.PI / 360));
    const x0 = Math.ceil(512 - width * .30), x1 = Math.floor(512 + width * .30), y = 256, count = x1 - x0 + 1;
    const rows = ['reference', 'eagle'].map(name => {
      const canvas = root.querySelector('canvas[data-distance-canvas="' + name + '"]') as HTMLCanvasElement;
      const rgba = Array.from(canvas.getContext('2d')!.getImageData(x0, y, count, 1).data), values: number[] = [];
      for (let i = 0; i < rgba.length; i += 4) values.push((rgba[i] + rgba[i + 1] + rgba[i + 2]) / 3);
      return { name: name === 'reference' ? 'human' : 'eagle', rgba, values, min: Math.min(...values), max: Math.max(...values),
        range: Math.max(...values) - Math.min(...values), png: canvas.toDataURL('image/png') };
    });
    return { distance, projectedWidth: width, x0, x1, y, count, rows };
  });
}

async function read(page: Page, keyboard = false) {
  const expected = await pixels(page), before = await work(page);
  await expect(page.locator(ui.read)).toBeEnabled();
  await activate(page, ui.read, keyboard);
  await expect(page.locator(ui.chart)).toBeVisible();
  await expect(page.locator(ui.error)).toHaveCount(0);
  await unchangedWork(page, before, 2);
  await expect(page.locator(ui.probe)).toHaveAttribute('min', '0');
  await expect(page.locator(ui.probe)).toHaveAttribute('max', String(expected.count - 1));
  await expect(page.locator(ui.probe)).toHaveAttribute('step', '1');
  await expect(page.locator(ui.images)).toHaveCount(2);
  for (const row of expected.rows) {
    await expect(page.locator('img[data-distance-signal-image="' + row.name + '"]')).toHaveAttribute('src', row.png);
  }
  await chartEvidence(page, expected);
  await expect(page.locator(ui.probe)).toHaveValue(String(Math.floor((expected.count - 1) / 2)));
  await probeValues(page, expected, Math.floor((expected.count - 1) / 2));
  return expected;
}

async function chartEvidence(page: Page, expected: Awaited<ReturnType<typeof pixels>>) {
  const chart = page.locator(ui.chart);
  await expect(chart).toHaveAttribute('viewBox', '0 0 640 300');
  await expect(chart).toHaveAttribute('role', 'img');
  await expect(chart).toHaveAccessibleName(/pixel|RGB|code|signal/i);
  for (const [name, value] of Object.entries({ 'plot-left': 50, 'plot-right': 620, 'plot-top': 24, 'plot-bottom': 246, max: 255, count: expected.count })) {
    await expect(chart).toHaveAttribute('data-' + name, String(value));
  }
  for (const row of expected.rows) {
    const line = page.locator('[data-distance-signal-line="' + row.name + '"]');
    const points = (await line.getAttribute('points'))!.trim().split(/\s+/).map(pair => pair.split(',').map(Number));
    expect(points).toHaveLength(expected.count);
    for (let index = 0; index < expected.count; index++) {
      // The same fixed 0..255 ordinate is required even when contrast is low.
      expect(Math.abs(points[index][0] - (50 + index / (expected.count - 1) * 570))).toBeLessThanOrEqual(.00051);
      expect(Math.abs(points[index][1] - (246 - row.values[index] / 255 * 222))).toBeLessThanOrEqual(.00051);
    }
    const range = page.locator('[data-distance-signal-range="' + row.name + '"]');
    expect(Number(await range.getAttribute('data-range'))).toBeCloseTo(row.range, 10);
    await expect(range).toContainText(row.range.toFixed(1));
    await expect(page.locator('[data-distance-signal-overlay="' + row.name + '"]')).toHaveAttribute('viewBox', '0 0 1024 512');
    const overlay = page.locator('[data-distance-signal-sample="' + row.name + '"]');
    for (const [attribute, value] of Object.entries({ x1: expected.x0, x2: expected.x1, y1: expected.y, y2: expected.y })) {
      await expect(overlay).toHaveAttribute(attribute, String(value));
    }
  }
  await expect.poll(() => page.locator(ui.images).evaluateAll(images => images.every(image => (image as HTMLImageElement).naturalWidth === 1024))).toBe(true);
  const geometry = await page.locator(ui.panel).evaluate(panel => ['human', 'eagle'].map(id => {
    const image = panel.querySelector('[data-distance-signal-image="' + id + '"]')!.getBoundingClientRect();
    const overlay = panel.querySelector('[data-distance-signal-overlay="' + id + '"]')!.getBoundingClientRect();
    return { image: { x: image.x, y: image.y, width: image.width, height: image.height },
      overlay: { x: overlay.x, y: overlay.y, width: overlay.width, height: overlay.height } };
  }));
  for (const pair of geometry) {
    expect(pair.image.width / pair.image.height).toBeCloseTo(2, 2);
    for (const key of ['x', 'y', 'width', 'height'] as const) expect(pair.overlay[key]).toBeCloseTo(pair.image[key], 1);
  }
  expect(geometry[0].image.width).toBeCloseTo(geometry[1].image.width, 1);
}

async function probeValues(page: Page, expected: Awaited<ReturnType<typeof pixels>>, index: number) {
  for (const row of expected.rows) {
    await expect(page.locator('[data-distance-signal-value="' + row.name + '"]')).toHaveText(row.values[index].toFixed(1));
    await expect(page.locator('[data-distance-signal-marker="' + row.name + '"]')).toHaveAttribute('cx', String(expected.x0 + index));
    await expect(page.locator('[data-distance-signal-marker="' + row.name + '"]')).toHaveAttribute('cy', String(expected.y));
  }
  await expect(page.locator(ui.pixel)).toHaveAttribute('data-x', String(expected.x0 + index));
  await expect(page.locator(ui.pixel)).toHaveAttribute('data-y', String(expected.y));
  await expect(page.locator(ui.pixel)).toContainText('Image pixel ' + (expected.x0 + index) + ', row ' + expected.y);
}

async function probe(page: Page, expected: Awaited<ReturnType<typeof pixels>>, index: number) {
  const before = await work(page);
  await setRange(page, ui.probe, index);
  await probeValues(page, expected, index);
  await unchangedWork(page, before);
}

async function noTrace(page: Page) {
  await expect(page.locator(ui.chart)).toHaveCount(0);
  await expect(page.locator(ui.images)).toHaveCount(0);
  await expect(page.locator('[data-distance-signal-line]')).toHaveCount(0);
}

function report(name: string, evidence: Awaited<ReturnType<typeof pixels>>) {
  const withoutPng = { ...evidence, rows: evidence.rows.map(({ png, ...row }) => row) };
  writeFileSync(resolve(output, name + '.json'), JSON.stringify(withoutPng, null, 2));
  const header = 'source_x,source_y,human_rgb_mean,eagle_rgb_mean';
  const csv = evidence.rows[0].values.map((value, i) => [evidence.x0 + i, evidence.y, value, evidence.rows[1].values[i]].join(','));
  writeFileSync(resolve(output, name + '.csv'), [header, ...csv].join('\n') + '\n');
}

async function close(page: Page, initialSiblings: unknown, keyboard = false) {
  expect(await siblings(page)).toEqual(initialSiblings);
  await page.locator(ui.root).evaluate((root: any) => { (window as any).distanceSignalClosedScene = root._distanceScene; });
  await activate(page, ui.close, keyboard);
  await expect(page.locator(ui.root)).toHaveCount(0); await expect(page.locator(ui.launch)).toBeFocused();
  const lifecycle = await page.evaluate(() => (window as any).distanceSignalClosedScene.getDiagnostics().lifecycle);
  expect(lifecycle).toMatchObject({ disposed: true, liveContexts: 0, rendererDisposed: true, birdDisposed: true, ownedResourceCount: 0 });
  expect((await harness.glContexts(page)).every(context => context.lost && context.lostBy === 'page')).toBe(true);
}

test.beforeAll(async () => { mkdirSync(output, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

test('plots actual RGB samples on matched axes and measures a controlled contrast change', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  const initial = await setup(page);
  await open(page); await expect(page.locator(ui.read)).toBeDisabled(); await noTrace(page);
  await reveal(page);
  const strong = await read(page);
  for (const index of [0, Math.floor(strong.count / 2), strong.count - 1]) await probe(page, strong, index);
  await page.locator(ui.panel).screenshot({ path: resolve(output, 'signal-desktop.jpg'), type: 'jpeg', quality: 88 });
  report('signal-95', strong);
  await setRange(page, '#rh-distance-contrast', 25);
  await expect(page.locator(ui.read)).toBeDisabled(); await noTrace(page);
  await reveal(page); const weak = await read(page); report('signal-25', weak);
  expect([weak.x0, weak.x1, weak.y, weak.count]).toEqual([strong.x0, strong.x1, strong.y, strong.count]);
  for (let i = 0; i < strong.rows.length; i++) {
    const ratio = weak.rows[i].range / strong.rows[i].range;
    expect(strong.rows[i].range).toBeGreaterThan(50);
    expect(ratio).toBeGreaterThan(.15); expect(ratio).toBeLessThan(.40);
  }
  await probe(page, weak, Math.floor(weak.count / 3));
  await close(page, initial.siblings); expect(initial.errors).toEqual([]);
});

test('invalidates old traces and retries failed pixel reads without changing the revealed scene', async ({ page }) => {
  const initial = await setup(page);
  await open(page); await reveal(page); await read(page);
  await activate(page, '[data-distance-prediction="eagle"]');
  await expect(page.locator(ui.read)).toBeDisabled(); await noTrace(page);
  await activate(page, ui.reveal); await expect(page.locator(ui.read)).toBeEnabled(); await noTrace(page);
  await read(page);
  await activate(page, ui.reveal); await noTrace(page);
  await read(page);
  await setRange(page, '#rh-distance-distance', 140);
  await expect(page.locator(ui.read)).toBeDisabled(); await noTrace(page);
  await reveal(page, 'eagle');
  await page.locator('canvas[data-distance-canvas="reference"]').evaluate((canvas: HTMLCanvasElement) => {
    const context = canvas.getContext('2d')! as any; context._signalRead = context.getImageData;
    context.getImageData = function () { throw new Error('Injected signal readback failure'); };
  });
  const beforeFailure = await work(page);
  try {
    await activate(page, ui.read);
    await expect(page.locator(ui.error)).toBeVisible(); await noTrace(page);
    await expect(page.locator('canvas[data-distance-canvas="reference"]')).toBeVisible();
    await expect(page.locator('canvas[data-distance-canvas="eagle"]')).toBeVisible();
    await unchangedWork(page, beforeFailure);
    await expect(page.locator(ui.read)).toBeEnabled();
  } finally {
    await page.locator('canvas[data-distance-canvas="reference"]').evaluate((canvas: HTMLCanvasElement) => {
      const context = canvas.getContext('2d')! as any; context.getImageData = context._signalRead; delete context._signalRead;
    });
  }
  const recovered = await read(page); report('signal-recovered', recovered);
  await probe(page, recovered, 0);
  await setRange(page, '#rh-distance-cycles', 20);
  await noTrace(page); await expect(page.locator(ui.read)).toBeDisabled();
  await reveal(page, 'neither'); await read(page);
  await close(page, initial.siblings); expect(initial.errors).toEqual([]);
});

test('supports keyboard pixel inspection on a phone and preserves pins, notebook and saved results', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  const initial = await setup(page);
  await page.locator('#wrap').evaluate((element: HTMLElement) => { element.style.width = '100%'; });
  await open(page, true); await reveal(page, 'both', true);
  await activate(page, '[data-distance-pin]', true);
  const pins = await page.locator('img[data-distance-pinned-image]').evaluateAll(nodes => nodes.map(node => (node as HTMLImageElement).src));
  const beforeRead = await work(page);
  await read(page, true);
  expect(await page.locator('img[data-distance-pinned-image]').evaluateAll(nodes => nodes.map(node => (node as HTMLImageElement).src))).toEqual(pins);
  expect((await work(page)).persisted).toEqual(beforeRead.persisted);
  await page.locator(ui.note).fill('This draft describes the pinned comparison before the signal starter.');
  await activate(page, ui.start, true);
  await expect(page.locator('[data-distance-guide]')).toHaveAttribute('data-stage', 'starter');
  await expect(page.locator('[data-distance-prediction="both"]')).toBeFocused();
  await expect(page.locator('#rh-distance-distance')).toHaveValue('80');
  await expect(page.locator('#rh-distance-cycles')).toHaveValue('8');
  await expect(page.locator('#rh-distance-contrast')).toHaveValue('95');
  await expect(page.locator('img[data-distance-pinned-image]')).toHaveCount(0);
  await expect(page.locator('[data-distance-draft-stale]')).toBeVisible(); await noTrace(page);
  await reveal(page, 'both', true); const evidence = await read(page, true);
  const beforeProbe = await work(page);
  await page.locator(ui.probe).focus(); await page.keyboard.press('Home');
  await expect(page.locator(ui.probe)).toHaveValue('0');
  await probeValues(page, evidence, 0);
  await page.keyboard.press('ArrowRight'); await expect(page.locator(ui.probe)).toHaveValue('1');
  await probeValues(page, evidence, 1);
  await page.keyboard.press('End'); await expect(page.locator(ui.probe)).toHaveValue(String(evidence.count - 1));
  await probeValues(page, evidence, evidence.count - 1);
  await unchangedWork(page, beforeProbe);
  await activate(page, '[data-distance-signal-note]', true); await expect(page.locator(ui.note)).toBeFocused();
  await expect(page.locator(ui.save)).toBeDisabled();
  await activate(page, '[data-distance-adopt-draft]', true); await expect(page.locator(ui.note)).toBeFocused();
  await activate(page, ui.save, true);
  const kept = (await work(page)).persisted;
  expect(kept.records).toHaveLength(2); expect(kept.records[0]).toEqual(priorRecord); expect(kept.fieldworkResults).toEqual(savedResults);
  const layout = await page.locator(ui.panel).evaluate((panel: HTMLElement) => {
    const p = panel.getBoundingClientRect(), chart = panel.querySelector('[data-distance-signal-chart]')!.getBoundingClientRect();
    const clippedLabels = [...panel.querySelectorAll('[data-distance-signal-chart] text')].filter(label => {
      const r = label.getBoundingClientRect();
      return r.left < chart.left || r.right > chart.right || r.top < chart.top || r.bottom > chart.bottom;
    }).map(label => label.textContent);
    return { viewport: innerWidth, documentWidth: document.documentElement.scrollWidth, x: p.x, right: p.right, chartWidth: chart.width, chartRight: chart.right, clippedLabels };
  });
  expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewport + 1); expect(layout.x).toBeGreaterThanOrEqual(0);
  expect(layout.right).toBeLessThanOrEqual(layout.viewport + 1); expect(layout.chartWidth).toBeGreaterThan(200);
  expect(layout.chartRight).toBeLessThanOrEqual(layout.viewport + 1);
  expect(layout.clippedLabels).toEqual([]);
  await page.locator(ui.panel).screenshot({ path: resolve(output, 'signal-mobile.jpg'), type: 'jpeg', quality: 88 });
  writeFileSync(resolve(output, 'signal-mobile-layout.json'), JSON.stringify(layout, null, 2));
  await close(page, initial.siblings, true); await open(page, true);
  await noTrace(page); await expect(page.locator(ui.read)).toBeDisabled();
  expect((await work(page)).persisted).toEqual(kept);
  await close(page, initial.siblings, true); expect(initial.errors).toEqual([]);
});
