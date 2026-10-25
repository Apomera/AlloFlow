import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off', trace: 'off' });
test.describe.configure({ timeout: 180000, retries: 0 });
const output = resolve(process.env.RAPTOR_DISTANCE_ROUND9_REPORT || 'reports/raptor-distance-round9-20261023');
const harness = new GlHarness({
  toolId: 'raptorHunt', toolFile: 'stem_lab/stem_tool_raptorhunt.js',
  preScripts: ['stem_lab/stem_lab_module.js'], width: 1120, height: 900,
  appStyles: true, layout: 'document',
  probes: 'window.StemLab.loadScriptResilient=window.signalComparisonNativeLoader;window.AlloPostFXEnabled=false;'
});
const ui = {
  root: '[data-raptor-distance-study]', launch: '[data-raptor-distance-launch]', close: '[data-raptor-distance-close]',
  panel: '[data-distance-signal]', summary: '[data-distance-signal] > summary', read: '[data-distance-signal-read]',
  chart: '[data-distance-signal-chart]', probe: '[data-distance-signal-probe]', error: '[data-distance-signal-error]',
  keep: '[data-distance-signal-keep]', kept: '[data-distance-signal-kept]', keptLabel: '[data-distance-signal-kept-label]',
  clear: '[data-distance-signal-clear]', lower: '[data-distance-signal-lower]', held: '[data-distance-signal-held]',
  pair: '[data-distance-signal-pair]', pairStatus: '[data-distance-signal-pair-status]',
  reveal: '[data-distance-reveal]', note: '[data-distance-note]', save: '[data-distance-save]'
};
const priorRecord = {
  version: 1, modelVersion: 1, distance: 120, cycles: 12, contrast: 95, widthM: .3,
  referenceLimit: 60, eagleLimit: 140, prediction: 'eagle', note: 'An earlier observation remains in my notebook.'
};
const savedResults = { version: 1, human: { version: 1, modelVersion: 1, reference: 'human', trials: [85, 86].map((distance, i) => ({
  settings: { version: 1, distance, cycles: 12, contrast: 95, widthM: .3, wideFov: 20, detailFov: .75 }, prediction: i ? 'eagle' : 'both'
})) } };

async function setup(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    const nativeFrame = window.requestAnimationFrame.bind(window), nativePng = HTMLCanvasElement.prototype.toDataURL;
    const nativeRead = CanvasRenderingContext2D.prototype.getImageData;
    (window as any).signalComparisonRafs = 0; (window as any).signalComparisonCaptures = 0; (window as any).signalComparisonReads = 0;
    window.requestAnimationFrame = callback => {
      if (/raptor_distance_(study|scene)\.js/.test(String(new Error().stack))) (window as any).signalComparisonRafs++;
      return nativeFrame(callback);
    };
    HTMLCanvasElement.prototype.toDataURL = function (...args: any[]) {
      if (this.hasAttribute('data-distance-canvas') && /raptor_distance_study\.js/.test(String(new Error().stack))) (window as any).signalComparisonCaptures++;
      return nativePng.apply(this, args as any);
    };
    CanvasRenderingContext2D.prototype.getImageData = function (...args: any[]) {
      if (this.canvas.hasAttribute('data-distance-canvas') && /raptor_distance_(study|signal)\.js/.test(String(new Error().stack))) (window as any).signalComparisonReads++;
      return nativeRead.apply(this, args as any);
    };
  });
  await page.route('**/stem_lab/stem_lab_module.js*', route => route.fulfill({
    contentType: 'text/javascript', body: readFileSync('stem_lab/stem_lab_module.js', 'utf8') + '\nwindow.signalComparisonNativeLoader=window.StemLab.loadScriptResilient;'
  }));
  await harness.mount(page, { raptorHunt: {
    activeSection: 'acuity', selectedSpecies: 'coopersHawk', activeMission: 'open',
    flightSession: { speciesId: 'coopersHawk', missionId: 'open' }, huntTutorialDismissed: true,
    graphicsQuality: 'low', xp: 97, huntStats: { attempts: 4, captures: 2 },
    acuity: { version: 2, distance: 18, span: 50, opacity: 75, target: 'plaque', guides: false },
    distantDetailStudy: { version: 1, distance: 80, cycles: 8, contrast: 95, records: [priorRecord], fieldworkResults: savedResults }
  } }, undefined, { expectCanvas: false });
  await expect(page.locator(ui.launch)).toBeVisible();
  expect(await harness.glContexts(page)).toEqual([]);
  return { errors, siblings: await siblings(page) };
}

async function siblings(page: Page) {
  return page.evaluate(() => { const result = { ...(window as any).__toolData.raptorHunt }; delete result.distantDetailStudy; return result; });
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

async function setRange(page: Page, name: string, value: number) {
  await page.locator('#rh-distance-' + name).evaluate((input: HTMLInputElement, next) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, String(next));
    input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
  await expect(page.locator('#rh-distance-' + name)).toHaveValue(String(value));
}

async function conditions(page: Page, distance: number, cycles: number, contrast: number) {
  for (const [name, value] of Object.entries({ distance, cycles, contrast })) await expect(page.locator('#rh-distance-' + name)).toHaveValue(String(value));
}

async function reveal(page: Page, keyboard = false) {
  await activate(page, '[data-distance-prediction="both"]', keyboard);
  await activate(page, ui.reveal, keyboard); await expect(page.locator('[data-distance-result]')).toBeVisible();
}

async function work(page: Page) {
  return page.locator(ui.root).evaluate((root: any) => ({
    diagnostics: root._distanceScene.getDiagnostics(), captures: (window as any).signalComparisonCaptures,
    reads: (window as any).signalComparisonReads, rafs: (window as any).signalComparisonRafs,
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
}

async function pixels(page: Page) {
  return page.locator(ui.root).evaluate((root: HTMLElement) => {
    const distance = Number((root.querySelector('#rh-distance-distance') as HTMLInputElement).value);
    const cycles = Number((root.querySelector('#rh-distance-cycles') as HTMLInputElement).value);
    const contrast = Number((root.querySelector('#rh-distance-contrast') as HTMLInputElement).value);
    const projectedWidth = 1024 * .30 / (2 * distance * Math.tan(.75 * Math.PI / 360));
    const x0 = Math.ceil(512 - projectedWidth * .30), x1 = Math.floor(512 + projectedWidth * .30), y = 256, count = x1 - x0 + 1;
    const rows = ['reference', 'eagle'].map(name => {
      const canvas = root.querySelector('canvas[data-distance-canvas="' + name + '"]') as HTMLCanvasElement;
      const rgba = Array.from(canvas.getContext('2d')!.getImageData(x0, y, count, 1).data), values: number[] = [];
      for (let index = 0; index < rgba.length; index += 4) values.push((rgba[index] + rgba[index + 1] + rgba[index + 2]) / 3);
      return { name: name === 'reference' ? 'human' : 'eagle', rgba, values, range: Math.max(...values) - Math.min(...values) };
    });
    return { distance, cycles, contrast, x0, x1, y, count, rows };
  });
}
type Reading = Awaited<ReturnType<typeof pixels>>;

async function read(page: Page, keyboard = false) {
  const expected = await pixels(page), before = await work(page);
  await expect(page.locator(ui.read)).toBeEnabled(); await activate(page, ui.read, keyboard);
  await expect(page.locator(ui.chart)).toBeVisible(); await expect(page.locator(ui.error)).toHaveCount(0);
  await unchangedWork(page, before, 2);
  return expected;
}

async function keptEvidence(page: Page, expected: Reading) {
  await expect(page.locator(ui.kept)).toBeVisible();
  await expect(page.locator(ui.keptLabel)).toContainText(new RegExp(expected.distance + '\\s*m'));
  await expect(page.locator(ui.keptLabel)).toContainText(expected.cycles + ' stripe pairs');
  await expect(page.locator(ui.keptLabel)).toContainText(expected.contrast + '%');
  for (const row of expected.rows) {
    const range = page.locator('[data-distance-signal-kept-range="' + row.name + '"]');
    expect(Number(await range.getAttribute('data-range'))).toBeCloseTo(row.range, 10);
    await expect(range).toHaveText(row.range.toFixed(1));
  }
}

async function keep(page: Page, expected: Reading, keyboard = false) {
  const before = await work(page);
  await expect(page.locator(ui.keep)).toBeEnabled(); await activate(page, ui.keep, keyboard);
  await keptEvidence(page, expected); await unchangedWork(page, before);
  await expect(page.locator('[data-distance-signal-kept-heading]')).toBeFocused();
}

async function pairEvidence(page: Page, kept: Reading, current: Reading) {
  expect([current.distance, current.cycles, current.x0, current.x1, current.y, current.count]).toEqual([kept.distance, kept.cycles, kept.x0, kept.x1, kept.y, kept.count]);
  await expect(page.locator(ui.pair)).toHaveAttribute('data-kind', current.contrast === kept.contrast ? 'same' : 'contrast');
  const ratios: Record<string, number> = {};
  for (const id of ['human', 'eagle']) {
    const original = kept.rows.find(row => row.name === id)!, latest = current.rows.find(row => row.name === id)!;
    const chart = page.locator('[data-distance-signal-pair-chart="' + id + '"]');
    await expect(chart).toBeVisible(); await expect(chart).toHaveAttribute('viewBox', '0 0 640 260');
    await expect(chart).toHaveAttribute('role', 'img');
    await expect(chart).toHaveAccessibleName(new RegExp(id, 'i'));
    for (const [attribute, value] of Object.entries({ 'plot-left': 54, 'plot-right': 620, 'plot-top': 24, 'plot-bottom': 216, max: 255, count: current.count })) {
      await expect(chart).toHaveAttribute('data-' + attribute, String(value));
    }
    for (const [suffix, reading] of [['kept', original], ['current', latest]] as const) {
      const line = page.locator('[data-distance-signal-pair-line="' + id + '-' + suffix + '"]');
      const points = (await line.getAttribute('points'))!.trim().split(/\s+/).map(pair => pair.split(',').map(Number));
      expect(points).toHaveLength(current.count);
      for (let index = 0; index < points.length; index++) {
        expect(Math.abs(points[index][0] - (54 + index / (current.count - 1) * 566))).toBeLessThanOrEqual(.00051);
        expect(Math.abs(points[index][1] - (216 - reading.values[index] / 255 * 192))).toBeLessThanOrEqual(.00051);
      }
      if (suffix === 'kept') expect(await line.getAttribute('stroke-dasharray')).toBeTruthy();
      else expect([null, 'none', '']).toContain(await line.getAttribute('stroke-dasharray'));
    }
    const range = page.locator('[data-distance-signal-pair-range="' + id + '"]');
    expect(Number(await range.getAttribute('data-range'))).toBeCloseTo(latest.range, 10);
    await expect(range).toHaveText(latest.range.toFixed(1));
    const ratio = latest.range / original.range; ratios[id] = ratio;
    const ratioOutput = page.locator('[data-distance-signal-pair-ratio="' + id + '"]');
    expect(Number(await ratioOutput.getAttribute('data-ratio'))).toBeCloseTo(ratio, 10);
    await expect(ratioOutput).toHaveText(ratio.toFixed(2) + '×');
  }
  await keptEvidence(page, kept);
  return ratios;
}

async function staleCurrent(page: Page) {
  await expect(page.locator(ui.pair)).toHaveCount(0); await expect(page.locator(ui.chart)).toHaveCount(0);
  await expect(page.locator(ui.pairStatus)).toBeVisible();
  await expect(page.locator(ui.keep)).toBeDisabled();
}

async function close(page: Page, initialSiblings: unknown, keyboard = false) {
  expect(await siblings(page)).toEqual(initialSiblings);
  await page.locator(ui.root).evaluate((root: any) => { (window as any).signalComparisonClosedScene = root._distanceScene; });
  await activate(page, ui.close, keyboard); await expect(page.locator(ui.root)).toHaveCount(0);
  await expect(page.locator(ui.launch)).toBeFocused();
  const lifecycle = await page.evaluate(() => (window as any).signalComparisonClosedScene.getDiagnostics().lifecycle);
  expect(lifecycle).toMatchObject({ disposed: true, liveContexts: 0, rendererDisposed: true, birdDisposed: true, ownedResourceCount: 0 });
  expect((await harness.glContexts(page)).every(context => context.lost && context.lostBy === 'page')).toBe(true);
}

test.beforeAll(async () => { mkdirSync(output, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

test('compares independently sampled kept and current traces in both contrast directions', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  const initial = await setup(page); await open(page); await reveal(page);
  const strong = await read(page); await keep(page, strong);
  expect(await pairEvidence(page, strong, strong)).toEqual({ human: 1, eagle: 1 });
  await expect(page.locator(ui.held)).toBeDisabled();
  await activate(page, ui.lower); await conditions(page, 80, 8, 25);
  await staleCurrent(page); await keptEvidence(page, strong);
  await expect(page.locator(ui.read)).toBeDisabled();
  await reveal(page); const weak = await read(page), lowerRatios = await pairEvidence(page, strong, weak);
  for (const ratio of Object.values(lowerRatios)) { expect(ratio).toBeGreaterThan(.15); expect(ratio).toBeLessThan(.40); }
  await page.locator(ui.kept).screenshot({ path: resolve(output, 'signal-comparison-desktop.jpg'), type: 'jpeg', quality: 88 });
  await keep(page, weak); expect(await pairEvidence(page, weak, weak)).toEqual({ human: 1, eagle: 1 });
  await expect(page.locator(ui.lower)).toBeDisabled();
  await setRange(page, 'contrast', 95); await staleCurrent(page); await reveal(page);
  const restored = await read(page), upperRatios = await pairEvidence(page, weak, restored);
  expect(restored.rows).toEqual(strong.rows);
  for (const id of ['human', 'eagle']) { expect(upperRatios[id]).toBeGreaterThan(2.5); expect(upperRatios[id] * lowerRatios[id]).toBeCloseTo(1, 10); }
  writeFileSync(resolve(output, 'signal-comparison-pixels.json'), JSON.stringify({ strong, weak, restored, lowerRatios, upperRatios }, null, 2));
  await close(page, initial.siblings); expect(initial.errors).toEqual([]);
});

test('keeps the baseline through stale views, changed held variables, failed reads and guided starters', async ({ page }) => {
  const initial = await setup(page); await open(page); await reveal(page);
  const baseline = await read(page); await keep(page, baseline);
  await activate(page, '[data-distance-prediction="eagle"]'); await staleCurrent(page); await keptEvidence(page, baseline);
  await expect(page.locator(ui.read)).toBeDisabled();
  await activate(page, ui.reveal); await staleCurrent(page); await read(page);
  await activate(page, ui.reveal); await staleCurrent(page); await keptEvidence(page, baseline);
  await read(page);
  await setRange(page, 'distance', 120); await reveal(page); await read(page);
  await expect(page.locator(ui.pair)).toHaveCount(0); await expect(page.locator(ui.pairStatus)).toBeVisible();
  await keptEvidence(page, baseline); await expect(page.locator(ui.held)).toBeEnabled();
  await setRange(page, 'cycles', 12); await setRange(page, 'contrast', 40); await reveal(page); await read(page);
  await expect(page.locator(ui.pair)).toHaveCount(0);
  await activate(page, ui.held); await conditions(page, 80, 8, 40);
  await expect(page.locator('[data-distance-prediction="both"]')).toBeFocused();
  await expect(page.locator(ui.reveal)).toBeDisabled(); await staleCurrent(page);
  await reveal(page); const heldRestored = await read(page); await pairEvidence(page, baseline, heldRestored);
  // Lowering contrast starts from the kept geometry even after free exploration.
  await setRange(page, 'distance', 160); await setRange(page, 'cycles', 16);
  await activate(page, ui.lower); await conditions(page, 80, 8, 25); await staleCurrent(page);
  await reveal(page);
  await page.locator('canvas[data-distance-canvas="reference"]').evaluate((canvas: HTMLCanvasElement) => {
    const context = canvas.getContext('2d')! as any; context._comparisonRead = context.getImageData;
    context.getImageData = function () { throw new Error('Injected comparison readback failure'); };
  });
  const beforeFailure = await work(page);
  try {
    await activate(page, ui.read); await expect(page.locator(ui.error)).toBeVisible();
    await staleCurrent(page); await keptEvidence(page, baseline); await unchangedWork(page, beforeFailure);
  } finally {
    await page.locator('canvas[data-distance-canvas="reference"]').evaluate((canvas: HTMLCanvasElement) => {
      const context = canvas.getContext('2d')! as any; context.getImageData = context._comparisonRead; delete context._comparisonRead;
    });
  }
  const retry = await read(page); await pairEvidence(page, baseline, retry);
  await activate(page, '[data-distance-signal-start]'); await keptEvidence(page, baseline); await staleCurrent(page);
  await expect(page.locator('[data-distance-guide]')).toHaveAttribute('data-stage', 'starter');
  await reveal(page); const restarted = await read(page); await pairEvidence(page, baseline, restarted);
  const beforeClear = await work(page); await activate(page, ui.clear);
  await expect(page.locator(ui.kept)).toHaveCount(0); await expect(page.locator(ui.pair)).toHaveCount(0);
  await expect(page.locator(ui.chart)).toBeVisible(); await unchangedWork(page, beforeClear);
  writeFileSync(resolve(output, 'signal-comparison-recovery.json'), JSON.stringify({ baseline, heldRestored, retry, restarted }, null, 2));
  await close(page, initial.siblings); expect(initial.errors).toEqual([]);
});

test('supports keyboard comparisons on a phone and keeps reading changes separate from saved notes and images', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  const initial = await setup(page);
  await page.locator('#wrap').evaluate((element: HTMLElement) => { element.style.width = '100%'; });
  await open(page, true); await reveal(page, true); await activate(page, '[data-distance-pin]', true);
  const pins = await page.locator('img[data-distance-pinned-image]').evaluateAll(nodes => nodes.map(node => (node as HTMLImageElement).src));
  const baseline = await read(page, true);
  const note = 'I began this observation before keeping a pixel reading.';
  await page.locator(ui.note).fill(note); await expect(page.locator(ui.save)).toBeEnabled();
  await keep(page, baseline, true);
  await expect(page.locator(ui.note)).toHaveValue(note); await expect(page.locator('[data-distance-draft-stale]')).toBeVisible();
  await expect(page.locator(ui.save)).toBeDisabled();
  await activate(page, '[data-distance-adopt-draft]', true); await expect(page.locator(ui.note)).toBeFocused();
  await expect(page.locator(ui.save)).toBeEnabled();
  // Replacing an identical-valued baseline is still a distinct note context.
  await keep(page, baseline, true); await expect(page.locator('[data-distance-draft-stale]')).toBeVisible();
  await expect(page.locator(ui.save)).toBeDisabled();
  await activate(page, ui.lower, true);
  await expect(page.locator('[data-distance-prediction="both"]')).toBeFocused();
  await reveal(page, true); const current = await read(page, true);
  await pairEvidence(page, baseline, current);
  await page.locator(ui.kept).screenshot({ path: resolve(output, 'signal-comparison-mobile.jpg'), type: 'jpeg', quality: 88 });
  expect(await page.locator('img[data-distance-pinned-image]').evaluateAll(nodes => nodes.map(node => (node as HTMLImageElement).src))).toEqual(pins);
  const beforeProbe = await work(page);
  await page.locator(ui.probe).focus(); await page.keyboard.press('Home'); await expect(page.locator(ui.probe)).toHaveValue('0');
  await page.keyboard.press('ArrowRight'); await expect(page.locator(ui.probe)).toHaveValue('1');
  for (const row of current.rows) await expect(page.locator('[data-distance-signal-value="' + row.name + '"]')).toHaveText(row.values[1].toFixed(1));
  await page.keyboard.press('End'); await expect(page.locator(ui.probe)).toHaveValue(String(current.count - 1));
  await unchangedWork(page, beforeProbe);
  await activate(page, '[data-distance-signal-note]', true); await expect(page.locator(ui.note)).toBeFocused();
  await activate(page, '[data-distance-adopt-draft]', true); await expect(page.locator(ui.save)).toBeEnabled();
  const beforeClear = await work(page); await activate(page, ui.clear, true); await unchangedWork(page, beforeClear);
  await expect(page.locator(ui.keep)).toBeFocused();
  await expect(page.locator(ui.kept)).toHaveCount(0); await expect(page.locator(ui.note)).toHaveValue(note);
  await expect(page.locator('[data-distance-draft-stale]')).toBeVisible(); await expect(page.locator(ui.save)).toBeDisabled();
  await keep(page, current, true); await pairEvidence(page, current, current);
  await activate(page, '[data-distance-adopt-draft]', true); await activate(page, ui.save, true);
  const persisted = (await work(page)).persisted;
  expect(persisted.records).toHaveLength(2); expect(persisted.records[0]).toEqual(priorRecord); expect(persisted.fieldworkResults).toEqual(savedResults);
  expect(persisted.records[1]).toMatchObject({ distance: 80, cycles: 8, contrast: 25, note,
    comparison: { version: 1, reference: { version: 1, distance: 80, cycles: 8, contrast: 95, widthM: .3, wideFov: 20, detailFov: .75 } } });
  const layout = await page.locator(ui.kept).evaluate((element: HTMLElement) => {
    const r = element.getBoundingClientRect();
    return { viewport: innerWidth, documentWidth: document.documentElement.scrollWidth, x: r.x, right: r.right,
      charts: Array.from(element.querySelectorAll('[data-distance-signal-pair-chart]')).map(chart => {
        const box = chart.getBoundingClientRect(); return { width: box.width, height: box.height, right: box.right,
          labels: Array.from(chart.querySelectorAll('text')).map(label => {
            const text = label.getBoundingClientRect(); return { text: label.textContent, x: text.x - box.x, y: text.y - box.y,
              right: text.right - box.x, bottom: text.bottom - box.y };
          }) };
      }) };
  });
  expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewport + 1); expect(layout.x).toBeGreaterThanOrEqual(0);
  expect(layout.right).toBeLessThanOrEqual(layout.viewport + 1); expect(layout.charts).toHaveLength(2);
  for (const chart of layout.charts) {
    expect(chart.width).toBeGreaterThan(200); expect(chart.right).toBeLessThanOrEqual(layout.viewport + 1);
    expect(chart.labels).toHaveLength(6);
    for (const label of chart.labels) {
      expect(label.x, label.text + ' left bound').toBeGreaterThanOrEqual(-1);
      expect(label.y, label.text + ' top bound').toBeGreaterThanOrEqual(-1);
      expect(label.right, label.text + ' right bound').toBeLessThanOrEqual(chart.width + 1);
      expect(label.bottom, label.text + ' bottom bound').toBeLessThanOrEqual(chart.height + 1);
    }
  }
  writeFileSync(resolve(output, 'signal-comparison-mobile.json'), JSON.stringify({ layout, baseline, current, persisted }, null, 2));
  await close(page, initial.siblings, true); await open(page, true);
  await expect(page.locator(ui.kept)).toHaveCount(0); await expect(page.locator(ui.pair)).toHaveCount(0);
  expect((await work(page)).persisted).toEqual(persisted);
  await close(page, initial.siblings, true); expect(initial.errors).toEqual([]);
});
